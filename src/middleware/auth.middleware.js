// <Shania Start>
// src/middleware/auth.middleware.js — shared auth guards. Teammates import these.
//   attachUser       → never blocks; sets req.user + res.locals.user when a valid token is present.
//   requireAuth      → API guard; 401 JSON for guests.
//   requireAuthPage  → page guard; redirects guests to /auth/login.
// Token is read from the httpOnly cookie OR an `Authorization: Bearer <token>` header.
const { verify } = require("../utils/jwt");

function extractToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

function attachUser(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verify(token);
      if (payload.type !== "refresh") {
        req.user = { id: payload.sub, username: payload.username, role: payload.role };
        res.locals.user = req.user;
      }
    } catch (_) {
      // invalid or expired token → treat as guest, never throw
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ error: "Authentication required." });
}

function requireAuthPage(req, res, next) {
  if (req.user) return next();
  const back = encodeURIComponent(req.originalUrl);
  return res.redirect(`/auth/login?next=${back}`);
}

module.exports = { attachUser, requireAuth, requireAuthPage, extractToken };
// <Shania End>
