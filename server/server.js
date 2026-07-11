import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./auth.js";
import { initDb, db } from "./db.js";
import { requireAuth } from "./authMiddleware.js";
import { sendTradeRequestEmail } from "./email.js";


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

app.get("/api/photo-stats", async (req, res) => {
    const { rows } = await db.query(`
        SELECT
                (SELECT COUNT(*)::int FROM photos) AS total,
                (SELECT COUNT(*)::int FROM claims) AS claimed
    `);

    const total = rows[0].total;
    const claimed = rows[0].claimed;

    res.json({
        total,
        claimed,
        remaining: total - claimed,
    });
});

app.post("/api/photos/seed", async (req, res) => {
    const count = Number(req.body?.count || 560);
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

    const { rows: countRows } = await db.query(
        `
            SELECT COUNT(*)::int AS count
            FROM claims
            WHERE claimed_by = $1
        `,
        [req.user.id]
    );

    if (countRows[0].count >= 24) {
        return res.status(403).json({
            error: "Maximum of 24 photos claimed",
        });
    }

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


app.post("/api/trades", async (req, res) => {
    const requestedPhotoId = Number(req.body?.requestedPhotoId);
    const offeredPhotoId = Number(req.body?.offeredPhotoId);

    if (!requestedPhotoId || !offeredPhotoId) {
        return res.status(400).json({ error: "requestedPhotoId and offeredPhotoId required" });
    }

    if (requestedPhotoId === offeredPhotoId) {
        return res.status(400).json({ error: "Cannot trade the same photo" });
    }

    const requesterId = req.user.id;

    const { rows: requestedRows } = await db.query(
        `
            SELECT claimed_by
            FROM claims
            WHERE photo_id = $1
        `,
        [requestedPhotoId]
    );

    if (!requestedRows.length) {
        return res.status(404).json({ error: "Requested photo is not claimed" });
    }

    const recipientId = requestedRows[0].claimed_by;

    if (recipientId === requesterId) {
        return res.status(400).json({ error: "You already own this photo" });
    }

    const { rows: offeredRows } = await db.query(
        `
            SELECT 1
            FROM claims
            WHERE photo_id = $1
              AND claimed_by = $2
        `,
        [offeredPhotoId, requesterId]
    );

    if (!offeredRows.length) {
        return res.status(403).json({ error: "You do not own the offered photo" });
    }

    const { rows } = await db.query(
        `
            INSERT INTO trade_requests (
                requester_id,
                recipient_id,
                requested_photo_id,
                offered_photo_id
            )
            VALUES ($1, $2, $3, $4)
                RETURNING *
        `,
        [requesterId, recipientId, requestedPhotoId, offeredPhotoId]
    );

    const trade = rows[0];

    let emailInfo = null;

    try {
        const { rows: emailRows } = await db.query(
            `
                SELECT
                    recipient.email AS recipient_email,
                    requester.email AS requester_email,
                    requested.filename AS requested_filename,
                    offered.filename AS offered_filename
                FROM trade_requests tr
                         JOIN users recipient ON recipient.id = tr.recipient_id
                         JOIN users requester ON requester.id = tr.requester_id
                         JOIN photos requested ON requested.id = tr.requested_photo_id
                         JOIN photos offered ON offered.id = tr.offered_photo_id
                WHERE tr.id = $1
            `,
            [trade.id]
        );

        emailInfo = emailRows[0];

        console.log("Trade email prepared:", {
            tradeId: trade.id,
            to: emailInfo?.recipient_email,
            requester: emailInfo?.requester_email,
        });
    } catch (emailError) {
        console.error("Could not prepare trade email:", emailError);
    }

    if (emailInfo) {
        sendTradeRequestEmail({
            to: emailInfo.recipient_email,
            requesterEmail: emailInfo.requester_email,
            requestedFilename: emailInfo.requested_filename,
            offeredFilename: emailInfo.offered_filename,
        }).catch((emailError) => {
            console.error("Trade email failed:", emailError);
        });
    }

    return res.json({ trade });
});

app.get("/api/trades/incoming", async (req, res) => {
    const { rows } = await db.query(
        `
    SELECT
      tr.id,
      tr.status,
      tr.created_at,
      requester.email AS requester_email,
      requested.filename AS requested_filename,
      offered.filename AS offered_filename,
      requested.id AS requested_photo_id,
      offered.id AS offered_photo_id
    FROM trade_requests tr
    JOIN users requester ON requester.id = tr.requester_id
    JOIN photos requested ON requested.id = tr.requested_photo_id
    JOIN photos offered ON offered.id = tr.offered_photo_id
    WHERE tr.recipient_id = $1
    ORDER BY tr.created_at DESC
    `,
        [req.user.id]
    );

    res.json({ trades: rows });
});

app.get("/api/trades/outgoing", async (req, res) => {
    const { rows } = await db.query(
        `
        SELECT
            tr.id,
            tr.status,
            tr.created_at,
            recipient.email AS recipient_email,
            requested.filename AS requested_filename,
            offered.filename AS offered_filename,
            requested.id AS requested_photo_id,
            offered.id AS offered_photo_id
        FROM trade_requests tr
        JOIN users recipient ON recipient.id = tr.recipient_id
        JOIN photos requested ON requested.id = tr.requested_photo_id
        JOIN photos offered ON offered.id = tr.offered_photo_id
        WHERE tr.requester_id = $1
        ORDER BY tr.created_at DESC
        `,
        [req.user.id]
    );

    res.json({ trades: rows });
});

app.post("/api/trades/:id/withdraw", async (req, res) => {
    const tradeId = Number(req.params.id);

    const result = await db.query(
        `
            UPDATE trade_requests
            SET status = 'withdrawn',
                responded_at = now()
            WHERE id = $1
              AND requester_id = $2
              AND status = 'pending'
        `,
        [tradeId, req.user.id]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({ error: "Trade not found" });
    }

    res.json({ ok: true });
});

app.post("/api/trades/:id/reject", async (req, res) => {
    const tradeId = Number(req.params.id);

    const result = await db.query(
        `
            UPDATE trade_requests
            SET status = 'rejected',
                responded_at = now()
            WHERE id = $1
              AND recipient_id = $2
              AND status = 'pending'
        `,
        [tradeId, req.user.id]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({ error: "Trade not found" });
    }

    res.json({ ok: true });
});

app.post("/api/trades/:id/accept", async (req, res) => {
    const tradeId = Number(req.params.id);

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const { rows } = await client.query(
            `
                SELECT *
                FROM trade_requests
                WHERE id = $1
                  AND recipient_id = $2
                  AND status = 'pending'
                    FOR UPDATE
            `,
            [tradeId, req.user.id]
        );

        if (!rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Trade not found" });
        }

        const trade = rows[0];

        const { rows: ownershipRows } = await client.query(
            `
                SELECT
                    EXISTS (
                        SELECT 1 FROM claims
                        WHERE photo_id = $1 AND claimed_by = $2
                    ) AS requester_still_owns_offered,
                    EXISTS (
                        SELECT 1 FROM claims
                        WHERE photo_id = $3 AND claimed_by = $4
                    ) AS recipient_still_owns_requested
            `,
            [
                trade.offered_photo_id,
                trade.requester_id,
                trade.requested_photo_id,
                trade.recipient_id,
            ]
        );

        if (
            !ownershipRows[0].requester_still_owns_offered ||
            !ownershipRows[0].recipient_still_owns_requested
        ) {
            await client.query(
                `
                    UPDATE trade_requests
                    SET status = 'expired',
                        responded_at = now()
                    WHERE id = $1
                `,
                [tradeId]
            );

            await client.query("COMMIT");
            return res.status(409).json({ error: "One of the photos is no longer owned by the original user" });
        }

        await client.query(
            `
                UPDATE claims
                SET claimed_by = $1,
                    claimed_at = now()
                WHERE photo_id = $2
            `,
            [trade.requester_id, trade.requested_photo_id]
        );

        await client.query(
            `
                UPDATE claims
                SET claimed_by = $1,
                    claimed_at = now()
                WHERE photo_id = $2
            `,
            [trade.recipient_id, trade.offered_photo_id]
        );

        await client.query(
            `
                UPDATE trade_requests
                SET status = 'accepted',
                    responded_at = now()
                WHERE id = $1
            `,
            [tradeId]
        );

        await client.query("COMMIT");

        res.json({ ok: true });
    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Could not accept trade" });
    } finally {
        client.release();
    }
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