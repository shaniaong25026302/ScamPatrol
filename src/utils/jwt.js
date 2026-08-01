// <Shania Start>
// src/utils/jwt.js — JWT signing/verification + httpOnly cookie options.
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "24h";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const DAY = 24 * 60 * 60 * 1000;

function signAccess(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefresh(payload) {
  return jwt.sign({ ...payload, type: "refresh" }, SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verify(token) {
  return jwt.verify(token, SECRET);
}

const isProd = () => process.env.NODE_ENV === "production";

// Whether to mark the auth cookies "secure", meaning the browser will only ever send them
// over HTTPS.
//
// The default is the right one: secure in production, not secure locally. But it is only a
// DEFAULT, because it assumes production means HTTPS, and our EC2 demo box serves plain
// HTTP. On that box the default is actively harmful and silently so: the browser accepts
// the login response, throws the cookie away because the connection is not HTTPS, and every
// request afterwards arrives with no cookie at all. Login reports success and the user is a
// guest on the very next page, with no error logged anywhere to explain it.
//
// So COOKIE_SECURE can override it. Accepts "1" or "true", because Ansible templates it as
// 1/0 and a human editing .env by hand will write true/false, and a setting that turns
// itself off when you spell it the reasonable way is worse than no setting.
//
// Set COOKIE_SECURE=0 only where production genuinely is plain HTTP. The moment TLS is put
// in front of the app, remove it or set it to 1.
function cookieSecure() {
  const v = process.env.COOKIE_SECURE;
  if (v === undefined || v === "") return isProd();
  return v === "1" || v === "true";
}

// [DevOps: Security by default / DevSecOps] auth token is an httpOnly cookie (not readable by JS,
// mitigates XSS token theft) and only sent over HTTPS in production (secure flag driven by env).
function accessCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: cookieSecure(), maxAge: DAY };
}

function refreshCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: cookieSecure(), maxAge: 7 * DAY };
}

// Must match the flags used when the cookie was SET, or the browser treats it as a different
// cookie and quietly refuses to clear it, which looks exactly like logout not working.
function clearCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: cookieSecure() };
}

module.exports = {
  signAccess,
  signRefresh,
  verify,
  accessCookieOpts,
  refreshCookieOpts,
  clearCookieOpts,
};
// <Shania End>
