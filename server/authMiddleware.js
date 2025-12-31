export function requireAuth(req, res, next) {
    if (!req.user) return res.sendStatus(401);
    next();
}