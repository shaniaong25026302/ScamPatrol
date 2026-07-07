// <Shania Start>
// src/controllers/auth.controller.js — the logic behind every /api/auth/* endpoint (routed in src/routes/auth.routes.js).
const crypto = require("crypto"); // Node built-in — used here to generate random reset tokens
const bcrypt = require("bcrypt"); // hashes passwords (one-way) so we never store the plain text

const User = require("../models/user.model"); // DB functions for users/resets — src/models/user.model.js
const mail = require("../services/mail.service"); // sends the reset email — src/services/mail.service.js
const { validateEmail, validateUsername, validatePassword } = require("../utils/validate"); // rules — src/utils/validate.js
const {
  signAccess, signRefresh, verify, // token helpers — src/utils/jwt.js
  accessCookieOpts, refreshCookieOpts, clearCookieOpts, // cookie settings — src/utils/jwt.js
} = require("../utils/jwt");

const SALT_ROUNDS = 12; // bcrypt cost: 2^12 hashing rounds — high enough to make cracking stolen hashes slow
const RESET_TTL_MS = 60 * 60 * 1000; // reset token lifetime = 1 hour in ms (60min × 60s × 1000ms)

// Clean up inputs so "Bob@X.com " and "bob@x.com" are the same account (prevents duplicate/phantom users).
const normEmail = (v) => (typeof v === "string" ? v.trim().toLowerCase() : v); // trim spaces + lowercase the email
const normName = (v) => (typeof v === "string" ? v.trim() : v); // trim spaces off the username

// Set BOTH auth cookies on the response. Called after register/login. res.cookie(name, value, options).
function issueSession(res, user) {
  const payload = { sub: user.id, username: user.username, role: user.role }; // what we store inside the JWT (sub = subject = user id)
  res.cookie("token", signAccess(payload), accessCookieOpts()); // access-token cookie (24h)
  res.cookie("refresh_token", signRefresh({ sub: user.id }), refreshCookieOpts()); // refresh-token cookie (7d)
}

// Strip a user down to only fields that are safe to return to the browser.
function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email, role: u.role };
}

// POST /api/auth/register — create a new account.
async function register(req, res) {
  const body = req.body || {}; // the JSON the client sent (|| {} guards against no body)
  const username = normName(body.username);
  const email = normEmail(body.email);
  const { password, confirmPassword } = body; // passwords aren't trimmed — a space could be intentional

  const errors = {}; // collect all field errors so we can return them together (better UX than one at a time)
  const uErr = validateUsername(username);
  if (uErr) errors.username = uErr;
  const eErr = validateEmail(email);
  if (eErr) errors.email = eErr;
  const pErr = validatePassword(password);
  if (pErr) errors.password = pErr;
  if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match."; // the two boxes must match
  if (Object.keys(errors).length) return res.status(400).json({ errors }); // any errors → 400 (Bad Request) with all of them

  if (await User.findByEmail(email)) // is the email taken?
    return res.status(409).json({ errors: { email: "That email is already registered." } }); // 409 = Conflict
  if (await User.findByUsername(username)) // is the username taken?
    return res.status(409).json({ errors: { username: "That username is taken." } });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // hash the password with 12 rounds (await = wait for it)
  const id = await User.createUser({ username, email, passwordHash }); // insert; returns the new id
  const user = { id, username, email, role: "user" }; // new accounts default to the "user" role

  issueSession(res, user); // log them straight in (set cookies)
  return res.status(201).json({ user: publicUser(user) }); // 201 = Created
}

// POST /api/auth/login — check email + password, then start a session.
async function login(req, res) {
  const email = normEmail((req.body || {}).email);
  const password = (req.body || {}).password;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const user = await User.findByEmail(email); // look up by email
  // Always run bcrypt.compare, even if the user doesn't exist, using a dummy hash. This makes login take
  // the same time whether or not the email is registered → attackers can't tell which emails exist (timing attack defence).
  const hash = user ? user.password_hash : "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash); // compare the typed password against the stored hash
  if (!user || !ok) return res.status(401).json({ error: "Invalid email or password." }); // generic message — don't reveal which was wrong

  issueSession(res, user); // set the cookies
  return res.json({ user: publicUser(user) });
}

// GET /api/auth/me — return the currently logged-in user. requireAuth guarantees req.user exists.
async function me(req, res) {
  const user = await User.findPublicById(req.user.id); // safe fields only
  if (!user) return res.status(404).json({ error: "User not found." }); // account deleted mid-session
  return res.json({ user });
}

// POST /api/auth/logout — clear both cookies.
async function logout(req, res) {
  res.clearCookie("token", clearCookieOpts()); // remove the access cookie
  res.clearCookie("refresh_token", clearCookieOpts()); // remove the refresh cookie
  return res.json({ ok: true });
}

// POST /api/auth/forgot-password — email a reset link (or hand it back on-screen if email is unavailable).
async function forgotPassword(req, res) {
  const email = normEmail((req.body || {}).email);
  const eErr = validateEmail(email);
  if (eErr) return res.status(400).json({ errors: { email: eErr } });

  const user = await User.findByEmail(email);
  const response = {
    // The SAME message whether or not the email exists → we never reveal who has an account (enumeration protection).
    message: "If that email is registered, a reset link has been sent. Check your inbox — and your spam/junk folder.",
  };

  if (user) { // only actually create a token if the email belongs to a real user
    const token = crypto.randomBytes(32).toString("hex"); // 32 random bytes → a 64-char hex string that's impossible to guess
    const expiresAt = new Date(Date.now() + RESET_TTL_MS); // now + 1 hour
    await User.deleteResetsForUser(user.id); // kill any older tokens first
    await User.createReset(user.id, token, expiresAt); // save the new token

    // Build the absolute link. APP_BASE_URL (set on Render) wins; otherwise use the request's own protocol+host.
    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`; // the clickable link

    // Prefer email. If it can't be delivered (Render free tier blocks SMTP), fall back to returning the link on-screen.
    let sent = false;
    if (mail.isConfigured()) { // is any email provider set up?
      try {
        await mail.sendPasswordReset(user.email, resetUrl); // actually send it (await = wait for the send)
        sent = true;
        response.emailed = true; // tell the client it went out by email
      } catch (e) {
        console.error("Password reset email failed:", e.message); // log but don't crash
      }
    } else {
      console.error("SMTP not configured — cannot send password reset email.");
    }
    if (!sent) { // email failed / not configured → put the link in the response so reset still works
      response.resetUrl = `/auth/reset-password?token=${token}`;
      response.message = "Email delivery is unavailable here — use the reset link below to set a new password.";
    }
  }
  return res.json(response); // always 200 — never reveal whether the email existed
}

// POST /api/auth/reset-password — set a new password using a valid token.
async function resetPassword(req, res) {
  const { token, password, confirmPassword } = req.body || {};
  if (!token) return res.status(400).json({ error: "Reset token is required." });

  const pErr = validatePassword(password); // new password must meet the rules
  if (pErr) return res.status(400).json({ errors: { password: pErr } });
  if (password !== confirmPassword)
    return res.status(400).json({ errors: { confirmPassword: "Passwords do not match." } });

  const reset = await User.findReset(token); // look up the token
  if (!reset || new Date(reset.expires_at) < new Date()) // missing, OR its expiry is before now (expired)
    return res.status(400).json({ error: "This reset link is invalid or has expired." });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // hash the new password
  await User.updatePassword(reset.user_id, passwordHash); // save it
  await User.deleteResetsForUser(reset.user_id); // burn all tokens (single-use)
  return res.json({ message: "Password updated. You can now log in." });
}

// POST /api/auth/refresh — issue a fresh access token using the refresh cookie (extends the session past 24h).
async function refresh(req, res) {
  const token = req.cookies && req.cookies.refresh_token; // read the refresh cookie
  if (!token) return res.status(401).json({ error: "No refresh token." });
  try {
    const payload = verify(token); // verify it (throws if invalid/expired)
    if (payload.type !== "refresh") throw new Error("wrong token type"); // must be a refresh token, not an access token
    const user = await User.findPublicById(payload.sub); // make sure the user still exists
    if (!user) return res.status(401).json({ error: "User no longer exists." });
    res.cookie("token", signAccess({ sub: user.id, username: user.username, role: user.role }), accessCookieOpts()); // new access cookie
    return res.json({ user });
  } catch (_) {
    return res.status(401).json({ error: "Invalid refresh token." }); // any problem → 401
  }
}

module.exports = { register, login, me, logout, forgotPassword, resetPassword, refresh }; // used by src/routes/auth.routes.js
// <Shania End>
