// <Shania Start>
// src/controllers/auth.controller.js — register, login, me, logout, password reset, refresh.
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const User = require("../models/user.model");
const mail = require("../services/mail.service");
const { validateEmail, validateUsername, validatePassword } = require("../utils/validate");
const {
  signAccess,
  signRefresh,
  accessCookieOpts,
  refreshCookieOpts,
  clearCookieOpts,
} = require("../utils/jwt");

const SALT_ROUNDS = 12;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

// Canonicalise auth inputs so casing/whitespace never creates "phantom" accounts
// or emails that look stuck. Emails are stored + matched lowercase; names are trimmed.
const normEmail = (v) => (typeof v === "string" ? v.trim().toLowerCase() : v);
const normName = (v) => (typeof v === "string" ? v.trim() : v);

function issueSession(res, user) {
  const payload = { sub: user.id, username: user.username, role: user.role };
  res.cookie("token", signAccess(payload), accessCookieOpts());
  res.cookie("refresh_token", signRefresh({ sub: user.id }), refreshCookieOpts());
}

function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email, role: u.role };
}

// POST /api/auth/register
async function register(req, res) {
  const body = req.body || {};
  const username = normName(body.username);
  const email = normEmail(body.email);
  const { password, confirmPassword } = body;

  const errors = {};
  const uErr = validateUsername(username);
  if (uErr) errors.username = uErr;
  const eErr = validateEmail(email);
  if (eErr) errors.email = eErr;
  const pErr = validatePassword(password);
  if (pErr) errors.password = pErr;
  if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  if (await User.findByEmail(email))
    return res.status(409).json({ errors: { email: "That email is already registered." } });
  if (await User.findByUsername(username))
    return res.status(409).json({ errors: { username: "That username is taken." } });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = await User.createUser({ username, email, passwordHash });
  const user = { id, username, email, role: "user" };

  issueSession(res, user);
  return res.status(201).json({ user: publicUser(user) });
}

// POST /api/auth/login
async function login(req, res) {
  const email = normEmail((req.body || {}).email);
  const password = (req.body || {}).password;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const user = await User.findByEmail(email);
  // Always run a compare to avoid leaking which emails exist (timing).
  const hash = user ? user.password_hash : "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return res.status(401).json({ error: "Invalid email or password." });

  issueSession(res, user);
  return res.json({ user: publicUser(user) });
}

// GET /api/auth/me  (requireAuth)
async function me(req, res) {
  const user = await User.findPublicById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.json({ user });
}

// POST /api/auth/logout
async function logout(req, res) {
  res.clearCookie("token", clearCookieOpts());
  res.clearCookie("refresh_token", clearCookieOpts());
  return res.json({ ok: true });
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  const email = normEmail((req.body || {}).email);
  const eErr = validateEmail(email);
  if (eErr) return res.status(400).json({ errors: { email: eErr } });

  const user = await User.findByEmail(email);
  const response = {
    message: "If that email is registered, a reset link has been sent. Check your inbox — and your spam/junk folder.",
  };

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    await User.deleteResetsForUser(user.id);
    await User.createReset(user.id, token, expiresAt);

    // Absolute link for the email; APP_BASE_URL wins (correct behind Render's proxy).
    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    // Prefer email. If it can't be delivered (e.g. Render free tier blocks outbound
    // SMTP), fall back to returning the link on-screen so reset is never fully broken.
    let sent = false;
    if (mail.isConfigured()) {
      try {
        await mail.sendPasswordReset(user.email, resetUrl);
        sent = true;
        response.emailed = true;
      } catch (e) {
        console.error("Password reset email failed:", e.message);
      }
    } else {
      console.error("SMTP not configured — cannot send password reset email.");
    }
    if (!sent) {
      // Email unavailable — hand back the link so the user can still reset.
      response.resetUrl = `/auth/reset-password?token=${token}`;
      response.message = "Email delivery is unavailable here — use the reset link below to set a new password.";
    }
  }
  return res.json(response);
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  const { token, password, confirmPassword } = req.body || {};
  if (!token) return res.status(400).json({ error: "Reset token is required." });

  const pErr = validatePassword(password);
  if (pErr) return res.status(400).json({ errors: { password: pErr } });
  if (password !== confirmPassword)
    return res.status(400).json({ errors: { confirmPassword: "Passwords do not match." } });

  const reset = await User.findReset(token);
  if (!reset || new Date(reset.expires_at) < new Date())
    return res.status(400).json({ error: "This reset link is invalid or has expired." });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await User.updatePassword(reset.user_id, passwordHash);
  await User.deleteResetsForUser(reset.user_id);
  return res.json({ message: "Password updated. You can now log in." });
}

module.exports = { register, login, me, logout, forgotPassword, resetPassword };
// <Shania End>
