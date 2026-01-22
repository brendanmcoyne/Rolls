import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db.js";

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const { rows } = await db.query(
            "SELECT id, email, name, picture FROM users WHERE id = $1",
            [id]
        );

        done(null, rows[0] || null);
    } catch (err) {
        done(err);
    }
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleSub = profile.id;
                const email = profile.emails?.[0]?.value || "";
                const name = profile.displayName || "";
                const picture = profile.photos?.[0]?.value || null;

                const { rows } = await db.query(
                    `
                    SELECT id, email, name, picture
                    FROM users
                    WHERE google_sub = $1
                    `,
                    [googleSub]
                );

                let user = rows[0];

                if (!user) {
                    const insert = await db.query(
                        `
                        INSERT INTO users (google_sub, email, name, picture)
                        VALUES ($1, $2, $3, $4)
                        RETURNING id, email, name, picture
                        `,
                        [googleSub, email, name, picture]
                    );

                    user = insert.rows[0];
                } else {
                    const update = await db.query(
                        `
                        UPDATE users
                        SET email = $1, name = $2, picture = $3
                        WHERE google_sub = $4
                        RETURNING id, email, name, picture
                        `,
                        [email, name, picture, googleSub]
                    );

                    user = update.rows[0];
                }

                done(null, user);
            } catch (err) {
                done(err);
            }
        }
    )
);

export default passport;
