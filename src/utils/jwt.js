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

// secure cookies only over HTTPS (prod); sameSite=lax is fine for same-site form posts.
function accessCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: isProd(), maxAge: DAY };
}

function refreshCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: isProd(), maxAge: 7 * DAY };
}

function clearCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: isProd() };
}

module.exports = {
  signAccess,
  signRefresh,
  verify,
  accessCookieOpts,
  refreshCookieOpts,
  clearCookieOpts,
};
