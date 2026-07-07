// <Shania Start>
// src/utils/jwt.js — helpers to create/verify JWTs and to define the auth cookie options.
// A JWT is a signed token that proves who the user is, so we don't hit the DB on every request.
// Used by src/controllers/auth.controller.js (issues tokens) and src/middleware/auth.middleware.js (verifies them).
const jwt = require("jsonwebtoken"); // library that signs + verifies JSON Web Tokens

const SECRET = process.env.JWT_SECRET; // the signing key (from .env). A token is only valid if signed with this exact secret.
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "24h"; // how long an access token lasts (default 24 hours)
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // how long a refresh token lasts (default 7 days)

const DAY = 24 * 60 * 60 * 1000; // one day in milliseconds (24h × 60m × 60s × 1000ms) — used for cookie maxAge

// Create a short-lived ACCESS token. payload = { sub: userId, username, role }.
function signAccess(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES }); // sign with our secret, stamped to expire in 24h
}

// Create a long-lived REFRESH token, tagged type:"refresh" so we can tell it apart from an access token.
function signRefresh(payload) {
  return jwt.sign({ ...payload, type: "refresh" }, SECRET, { expiresIn: REFRESH_EXPIRES }); // spread payload + add the tag
}

// Verify a token: checks the signature matches SECRET and it hasn't expired. Throws if invalid (callers catch it).
function verify(token) {
  return jwt.verify(token, SECRET); // returns the decoded payload object on success
}

const isProd = () => process.env.NODE_ENV === "production"; // true only when deployed — controls the "secure" cookie flag

// [DevOps: Security by default] cookie options for the access token.
function accessCookieOpts() {
  return {
    httpOnly: true, // JavaScript in the browser CANNOT read this cookie → protects the token from XSS theft
    sameSite: "lax", // don't send this cookie on cross-site requests → helps prevent CSRF
    secure: isProd(), // only send over HTTPS in production (locally it's http, so false)
    maxAge: DAY, // the cookie itself expires after 24h (matches the token)
  };
}

// Same flags, but the refresh cookie lives 7 days (7 × DAY).
function refreshCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: isProd(), maxAge: 7 * DAY };
}

// Same flags, no maxAge — used to clear the cookies on logout.
function clearCookieOpts() {
  return { httpOnly: true, sameSite: "lax", secure: isProd() };
}

module.exports = {
  signAccess, // make an access token
  signRefresh, // make a refresh token
  verify, // check a token is genuine
  accessCookieOpts, // cookie settings for the access token
  refreshCookieOpts, // cookie settings for the refresh token
  clearCookieOpts, // cookie settings used when logging out
};
// <Shania End>
