import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db.js";

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
    const user = db
        .prepare("SELECT id, email, name, picture FROM users WHERE id = ?")
        .get(id);
    done(null, user || null);
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/api/auth/google/callback"
        },
        (accessToken, refreshToken, profile, done) => {
            try {
                const sub = profile.id;
                const email = profile.emails?.[0]?.value || "";
                const name = profile.displayName || "";
                const picture = profile.photos?.[0]?.value || null;

                let user = db
                    .prepare("SELECT id, email, name, picture FROM users WHERE google_sub = ?")
                    .get(sub);

                if (!user) {
                    const result = db
                        .prepare("INSERT INTO users (google_sub, email, name, picture) VALUES (?, ?, ?, ?)")
                        .run(sub, email, name, picture);

                    user = { id: result.lastInsertRowid, email, name, picture };
                } else {
                    db.prepare("UPDATE users SET email=?, name=?, picture=? WHERE google_sub=?")
                        .run(email, name, picture, sub);
                    user = { ...user, email, name, picture };
                }

                done(null, user);
            } catch (e) {
                done(e);
            }
        }
    )
);

export default passport;
