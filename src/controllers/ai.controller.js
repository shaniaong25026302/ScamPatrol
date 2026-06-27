// src/controllers/ai.controller.js — AI Scam Checker endpoints.
//   analyze  → open to guests (limited) + users (full + saved history)
//   history  → users only
const Ai = require("../models/ai.model");
const { analyzeText } = require("../services/gemini.service");

const MIN_LEN = 10;
const MAX_LEN = 10000;
const GUEST_LIMIT = 5; // free checks per guest before sign-up is required
const DAY = 24 * 60 * 60 * 1000;
const isProd = () => process.env.NODE_ENV === "production";

function validateInput(text) {
  if (typeof text !== "string" || !text.trim()) return "Enter a message to check.";
  const trimmedLen = text.trim().length;
  if (trimmedLen < MIN_LEN) return `Message must be at least ${MIN_LEN} characters.`;
  if (text.length > MAX_LEN) return `Message must be ${MAX_LEN} characters or fewer.`;
  return null;
}

// POST /api/ai/analyze
async function analyze(req, res) {
  const { text } = req.body || {};
  const err = validateInput(text);
  if (err) return res.status(400).json({ error: err });

  const isGuest = !req.user;
  const guestUsed = parseInt((req.cookies && req.cookies.ai_guest_used) || "0", 10) || 0;
  if (isGuest && guestUsed >= GUEST_LIMIT) {
    return res.status(403).json({
      error: "You've used all free guest checks. Create an account for unlimited checks and saved history.",
      limited: true,
    });
  }

  let result;
  try {
    result = await analyzeText(text);
  } catch (e) {
    console.error("Gemini analyze failed:", e.message);
    return res.status(502).json({ error: "The AI checker is temporarily unavailable. Please try again shortly." });
  }

  // Persist: users keep history; guest checks are stored with NULL user_id.
  try {
    await Ai.createAnalysis({
      userId: req.user ? req.user.id : null,
      inputText: text,
      riskLevel: result.risk_level,
      explanation: result.explanation,
    });
  } catch (e) {
    console.error("Saving analysis failed:", e.message);
  }

  if (isGuest) {
    const used = guestUsed + 1;
    res.cookie("ai_guest_used", String(used), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd(),
      maxAge: DAY,
    });
    return res.json({ ...result, saved: false, guest: true, remaining: Math.max(0, GUEST_LIMIT - used) });
  }

  return res.json({ ...result, saved: true });
}

// GET /api/ai/history  (requireAuth)
async function history(req, res) {
  const rows = await Ai.historyForUser(req.user.id, 20);
  return res.json({ history: rows });
}

module.exports = { analyze, history };
