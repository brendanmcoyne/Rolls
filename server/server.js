import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./auth.js";
import { initDb, db } from "./db.js";
import { requireAuth } from "./authMiddleware.js";

const app = express();

const PORT = process.env.PORT || 3000;

async function start() {
    await initDb();

    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

start();

const FRONTEND_URL = process.env.FRONTEND_URL;

app.set("trust proxy", 1);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            const normalizedOrigin = origin.replace(/\/$/, "");
            const allowedOrigin = FRONTEND_URL.replace(/\/$/, "");

            if (normalizedOrigin === allowedOrigin) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(express.json());

app.use(
    session({
        name: "sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            httpOnly: true,
            sameSite: "none",
            secure: "auto",
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_, res) => {
    res.send("Server running ✅");
});

app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: FRONTEND_URL }),
    (req, res) => {
        req.session.save(() => {
            res.redirect(FRONTEND_URL);
        });
    }
);

app.post("/api/logout", (req, res) => {
    req.logout(() => res.sendStatus(200));
});

app.get("/api/me", (req, res) => {
    if (!req.user) return res.sendStatus(401);
    res.json(req.user);
});

app.use("/api", requireAuth);

app.post("/api/photos/seed", async (req, res) => {
    const count = Number(req.body?.count || 400);
    await db.query(
        `
        INSERT INTO photos (filename, uploaded_by)
        SELECT (gs::text || '.jpg') AS filename, $1
        FROM generate_series(1, $2) AS gs
        ON CONFLICT (filename) DO NOTHING
        `,
        [req.user.id, count]
    );

    res.json({ ok: true, seeded: count });
});


app.get("/api/roll", async (req, res) => {
    const n = 6;
    const { rows: windowRows } = await db.query(`
        SELECT
            date_trunc('hour', now())
                - (extract(hour from now())::int % 3) * interval '1 hour'
                AS window_start
    `);

    const windowStart = windowRows[0].window_start;

    const { rows: existing } = await db.query(
        `
        SELECT photo_ids
        FROM rolls
        WHERE user_id = $1
          AND window_start = $2
        `,
        [req.user.id, windowStart]
    );

    if (existing.length > 0) {
        const { rows } = await db.query(
            `
            SELECT id, filename
            FROM photos
            WHERE id = ANY($1)
            `,
            [existing[0].photo_ids]
        );

        return res.json({ slots: rows });
    }

    const { rows } = await db.query(
        `
        SELECT p.id, p.filename
        FROM photos p
        LEFT JOIN claims c ON c.photo_id = p.id
        WHERE c.photo_id IS NULL
        ORDER BY RANDOM()
        LIMIT $1
        `,
        [n]
    );

    const photoIds = rows.map(r => r.id);

    await db.query(
        `
        INSERT INTO rolls (user_id, window_start, photo_ids)
        VALUES ($1, $2, $3)
        `,
        [req.user.id, windowStart, photoIds]
    );

    res.json({ slots: rows });
});

app.post("/api/claim", async (req, res) => {
    const photoId = Number(req.body?.photoId);
    if (!photoId) {
        return res.status(400).json({ error: "photoId required" });
    }

    // ✅ TOTAL CLAIM LIMIT
    const { rows: countRows } = await db.query(
        `
            SELECT COUNT(*)::int AS count
            FROM claims
            WHERE claimed_by = $1
        `,
        [req.user.id]
    );

    if (countRows[0].count >= 20) {
        return res.status(403).json({
            error: "Maximum of 20 photos claimed",
        });
    }

    // ⏱ window restriction (existing logic)
    const { rows: already } = await db.query(
        `
            SELECT 1
            FROM claims
            WHERE claimed_by = $1
              AND claimed_at >= date_trunc('hour', now())
                - (extract(hour from now())::int % 3) * interval '1 hour'
                LIMIT 1
        `,
        [req.user.id]
    );

    if (already.length > 0) {
        const { rows } = await db.query(`
            SELECT
                date_trunc('hour', now())
                + (3 - (extract(hour from now())::int % 3)) * interval '1 hour'
                AS reset
        `);

        return res.status(429).json({
            error: "Already claimed this window",
            retryAt: rows[0].reset.getTime(),
        });
    }

    // 🎲 ensure photo was rolled
    const { rows: roll } = await db.query(
        `
        SELECT photo_ids
        FROM rolls
        WHERE user_id = $1
          AND window_start = (
            date_trunc('hour', now())
            - (extract(hour from now())::int % 3) * interval '1 hour'
          )
        `,
        [req.user.id]
    );

    if (!roll.length || !roll[0].photo_ids.includes(photoId)) {
        return res.status(403).json({
            error: "Photo not in your roll",
        });
    }

    // 🧾 claim
    try {
        await db.query(
            `
                INSERT INTO claims (photo_id, claimed_by)
                VALUES ($1, $2)
            `,
            [photoId, req.user.id]
        );

        res.json({ ok: true });
    } catch {
        res.status(409).json({ error: "Photo already claimed" });
    }
});


app.get("/api/claims", async (req, res) => {
    const { rows } = await db.query(
        `
            SELECT
                p.id,
                p.filename,
                u.email
            FROM claims c
                     JOIN photos p ON p.id = c.photo_id
                     JOIN users u ON u.id = c.claimed_by
        `
    );

    res.json({ claims: rows });
});



app.get("/api/my-claims", async (req, res) => {
    const { rows } = await db.query(
        `
        SELECT p.id, p.filename, c.claimed_at
        FROM claims c
        JOIN photos p ON p.id = c.photo_id
        WHERE c.claimed_by = $1
        ORDER BY c.claimed_at DESC
        `,
        [req.user.id]
    );

    res.json({ cards: rows });
});


app.post("/api/unclaim", async (req, res) => {
    const photoId = Number(req.body?.photoId);
    if (!photoId) {
        return res.status(400).json({ error: "photoId required" });
    }

    const result = await db.query(
        `
        DELETE FROM claims
        WHERE photo_id = $1
          AND claimed_by = $2
        `,
        [photoId, req.user.id]
    );

    if (result.rowCount === 0) {
        return res.status(403).json({
            error: "You do not own this claim or it does not exist",
        });
    }

    res.json({ ok: true });
});


export default app;
