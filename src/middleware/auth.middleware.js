// <Shania Start>
// src/middleware/auth.middleware.js — three reusable auth guards used across the app (mine + teammates').
// attachUser is mounted globally in src/server.js; requireAuth/requireAuthPage guard specific routes.
const { verify } = require("../utils/jwt"); // verify() checks a token is genuine — from src/utils/jwt.js

// Find the JWT on the request. Returns the token string, or null if there isn't one (a guest).
function extractToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token; // 1st choice: the httpOnly "token" cookie (browser)
  const header = req.headers.authorization; // 2nd choice: an "Authorization: Bearer <token>" header (API tools)
  if (header && header.startsWith("Bearer ")) return header.slice(7); // slice(7) drops the "Bearer " prefix (7 chars)
  return null; // no token found → treat as a guest
}

// attachUser — runs on EVERY request. If a valid token is present, attach the user; else carry on as a guest. Never blocks.
function attachUser(req, res, next) {
  const token = extractToken(req); // try to find a token
  if (token) {
    try {
      const payload = verify(token); // decode + verify (throws if signature is wrong or it's expired)
      if (payload.type !== "refresh") { // ignore refresh tokens here — only access tokens identify a user
        req.user = { id: payload.sub, username: payload.username, role: payload.role }; // attach the user
        res.locals.user = req.user; // also expose to EJS templates (so pages can show the username)
      }
    } catch (_) {
      // invalid or expired token → leave req.user unset (guest). We swallow the error so a bad cookie can't break the request.
    }
  }
  next(); // hand control to the next middleware/route (always — this guard never stops the request)
}

// requireAuth — put on API routes that need login. Lets logged-in users through, blocks guests with 401 JSON.
function requireAuth(req, res, next) {
  if (req.user) return next(); // attachUser already set req.user → logged in → continue
  return res.status(401).json({ error: "Authentication required." }); // 401 = Unauthorized
}

// requireAuthPage — the page version. Redirects guests to the login page instead of a JSON error.
function requireAuthPage(req, res, next) {
  if (req.user) return next(); // logged in → continue
  const back = encodeURIComponent(req.originalUrl); // remember the page they wanted; encode makes it URL-safe
  return res.redirect(`/auth/login?next=${back}`); // send to login with ?next= so we can return them after
}

module.exports = { attachUser, requireAuth, requireAuthPage, extractToken }; // exported for server.js + every protected route
// <Shania End>
