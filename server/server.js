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

/* -------------------- BASIC ROUTES -------------------- */

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

/* -------------------- AUTH GUARD -------------------- */

app.use("/api", requireAuth);

/* -------------------- PHOTOS -------------------- */

app.post("/api/photos/seed", (req, res) => {
    const count = Number(req.body?.count || 400);

    const insert = db.prepare(
        "INSERT OR IGNORE INTO photos (filename, uploaded_by) VALUES (?, ?)"
    );

    const tx = db.transaction(() => {
        for (let i = 1; i <= count; i++) {
            insert.run(`${i}.jpg`, req.user.id);
        }
    });

    tx();
    res.json({ ok: true, seeded: count });
});

app.get("/api/roll", async (req, res) => {
    const n = Math.min(Number(req.query.n || 6), 6);

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

    res.json({ slots: rows });
});

app.post("/api/claim", async (req, res) => {
    const photoId = Number(req.body?.photoId);
    if (!photoId) {
        return res.status(400).json({ error: "photoId required" });
    }

    // Check if user already claimed in current 3-hour window (ET)
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
        const { rows } = await db.query(
            `
            SELECT
                date_trunc('hour', now())
                + (3 - (extract(hour from now())::int % 3)) * interval '1 hour'
                AS reset
            `
        );

        return res.status(429).json({
            error: "Already claimed this window",
            retryAt: rows[0].reset.getTime(),
        });
    }

    try {
        await db.query(
            `
            INSERT INTO claims (photo_id, claimed_by)
            VALUES ($1, $2)
            `,
            [photoId, req.user.id]
        );

        const { rows } = await db.query(
            `
            SELECT id, filename
            FROM photos
            WHERE id = $1
            `,
            [photoId]
        );

        res.json({
            ok: true,
            claimed: rows[0],
        });
    } catch (err) {
        res.status(409).json({ error: "Photo already claimed" });
    }
});

app.get("/api/claims", (_, res) => {
    const rows = db.prepare(`
        SELECT p.id, p.filename, c.claimed_by
        FROM claims c
                 JOIN photos p ON p.id = c.photo_id
    `).all();

    res.json({ claims: rows });
});

app.get("/api/my-claims", (req, res) => {
    const rows = db.prepare(`
        SELECT p.id, p.filename, c.claimed_at
        FROM claims c
                 JOIN photos p ON p.id = c.photo_id
        WHERE c.claimed_by = ?
        ORDER BY c.claimed_at DESC
    `).all(req.user.id);

    res.json({ cards: rows });
});

app.post("/api/unclaim", (req, res) => {
    const photoId = Number(req.body?.photoId);
    if (!photoId) {
        return res.status(400).json({ error: "photoId required" });
    }

    const result = db.prepare(`
        DELETE FROM claims
        WHERE photo_id = ?
          AND claimed_by = ?
    `).run(photoId, req.user.id);

    if (result.changes === 0) {
        return res.status(403).json({
            error: "You do not own this claim or it does not exist",
        });
    }

    res.json({ ok: true });
});

export default app;
