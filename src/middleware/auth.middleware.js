// <Shania Start>
// src/middleware/auth.middleware.js — shared auth guards. Teammates import these.
//   attachUser       → never blocks; sets req.user + res.locals.user. Auto-renews the session from the refresh token.
//   requireAuth      → API guard; 401 JSON for guests.
// Token is read from the httpOnly cookie OR an `Authorization: Bearer <token>` header.
const { verify, signAccess, signRefresh, accessCookieOpts, refreshCookieOpts } = require("../utils/jwt");
const User = require("../models/user.model");

function extractToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Sets req.user from a valid access token. If the access token is missing/expired but a valid refresh
// token is present, re-loads the user and renews BOTH cookies (sliding session) so an active login never
// expires. Never blocks — guests just pass through.
async function attachUser(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verify(token);
      if (payload.type !== "refresh") {
        req.user = { id: payload.sub, username: payload.username, role: payload.role };
        res.locals.user = req.user;
        return next();
      }
    } catch (_) {
      // invalid/expired access token → fall through to the refresh step
    }
  }

  // No usable access token → try the 7-day refresh token to auto-renew the session.
  try {
    const rtoken = req.cookies && req.cookies.refresh_token;
    if (rtoken) {
      const rpayload = verify(rtoken);
      if (rpayload.type === "refresh") {
        const user = await User.findPublicById(rpayload.sub);
        if (user) {
          req.user = { id: user.id, username: user.username, role: user.role };
          res.locals.user = req.user;
          res.cookie("token", signAccess({ sub: user.id, username: user.username, role: user.role }), accessCookieOpts());
          res.cookie("refresh_token", signRefresh({ sub: user.id }), refreshCookieOpts());
        }
      }
    }
  } catch (_) {
    // refresh token missing/expired/invalid → treat as guest
  }

  next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ error: "Authentication required." });
}

module.exports = { attachUser, requireAuth, extractToken };
// <Shania End>
