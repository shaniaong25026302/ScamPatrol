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

// Production normally means HTTPS, but the current EC2 demo is intentionally served
// over plain HTTP until TLS is added. A Secure cookie is silently rejected over HTTP,
// which makes a successful login redirect straight back to the guest page. Keep the
// transport choice explicit instead of weakening NODE_ENV or guessing from a proxy.
function useSecureCookies() {
  const configured = process.env.COOKIE_SECURE;
  if (configured === undefined || configured === "") return isProd();

  const value = configured.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;

  throw new Error("COOKIE_SECURE must be true/false or 1/0");
}

// [DevOps: Security by default / DevSecOps] auth token is an httpOnly cookie (not readable by JS,
// mitigates XSS token theft). COOKIE_SECURE must match the public URL: false for the
// current HTTP-only EC2 demo, then true as soon as HTTPS is enabled.
function accessCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: useSecureCookies(), maxAge: DAY };
}

function refreshCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: useSecureCookies(), maxAge: 7 * DAY };
}

function clearCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: useSecureCookies() };
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
