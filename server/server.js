import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./auth.js";
import { initDb } from "./db.js";
import { requireAuth } from "./authMiddleware.js";

const app = express();
initDb();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Helps with cookies/sessions in some setups (safe on localhost)
app.set("trust proxy", 1);

// =====================
// MIDDLEWARE (GLOBAL)
// =====================
app.use(
    cors({
        origin: FRONTEND_URL,
        credentials: true
    })
);

app.use(express.json());

// Log every request and whether the browser sent cookies
app.use((req, res, next) => {
    console.log("➡️", req.method, req.url, "cookie?", Boolean(req.headers.cookie));
    next();
});

app.use(
    session({
        name: "sid", // nicer than connect.sid; either works
        secret: process.env.SESSION_SECRET || "dev-secret-change-me",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false // IMPORTANT for http://localhost
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

// =====================
// PUBLIC ROUTES
// (no login required)
// =====================
app.get("/", (req, res) => {
    res.send("Server is running ✅");
});

app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: FRONTEND_URL }),
    (req, res) => {
        console.log("✅ callback reached");
        console.log("✅ req.user:", req.user);
        console.log("✅ sessionID:", req.sessionID);
        res.redirect(FRONTEND_URL);
    }
);

app.post("/api/logout", (req, res) => {
    req.logout(() => res.sendStatus(200));
});

// IMPORTANT: /api/me should be reachable even when logged out,
// so the frontend can check login status and show the login screen.
app.get("/api/me", (req, res) => {
    console.log("📍 /api/me user:", req.user);
    if (!req.user) return res.sendStatus(401);
    res.json(req.user);
});

// =====================
// AUTH WALL (everything else)
// =====================
app.use("/api", requireAuth);

// =====================
// PROTECTED ROUTES
// (login required)
// =====================
// Add future routes here:
// app.get("/api/photos", ...)
// app.post("/api/photos/:id/claim", ...)

app.listen(3000, () => {
    console.log("Backend running on http://localhost:3000");
});
