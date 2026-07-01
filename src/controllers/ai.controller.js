// <Shania Start>
// src/controllers/ai.controller.js — AI Scam Checker endpoints (login required; guests are gated out).
//   analyze       → analyse a message (+ XP), saved to the user's history
//   history       → the user's past checks
//   relationship  → long-con / romance scam timeline mapper
const Ai = require("../models/ai.model");
const { analyzeText, analyzeRelationship } = require("../services/gemini.service");
const gamify = require("../services/gamification.service");

const MIN_LEN = 10;
const MAX_LEN = 10000;

function validateInput(text) {
  if (typeof text !== "string" || !text.trim()) return "Enter a message to check.";
  if (text.trim().length < MIN_LEN) return `Message must be at least ${MIN_LEN} characters.`;
  if (text.length > MAX_LEN) return `Message must be ${MAX_LEN} characters or fewer.`;
  return null;
}

// POST /api/ai/analyze
async function analyze(req, res) {
  const { text } = req.body || {};
  const err = validateInput(text);
  if (err) return res.status(400).json({ error: err });

  let result;
  try {
    result = await analyzeText(text);
  } catch (e) {
    console.error("Gemini analyze failed:", e.message);
    return res.status(502).json({ error: "The AI checker is temporarily unavailable. Please try again shortly." });
  }

  try {
    await Ai.createAnalysis({
      userId: req.user.id,
      inputText: text,
      riskLevel: result.risk_level,
      explanation: result.explanation,
    });
  } catch (e) {
    console.error("Saving analysis failed:", e.message);
  }

  // Gamification: reward the check (+ bonus for catching a high-risk scam).
  const reward = await gamify.award(req.user.id, "ai_check");
  if (result.risk_level === "high") await gamify.award(req.user.id, "high_risk_caught");
  return res.json({ ...result, saved: true, reward });
}

// GET /api/ai/history
async function history(req, res) {
  const rows = await Ai.historyForUser(req.user.id, 20);
  return res.json({ history: rows });
}

// POST /api/ai/relationship — long-con / romance scam timeline mapper.
async function relationship(req, res) {
  const { text } = req.body || {};
  if (typeof text !== "string" || text.trim().length < 20)
    return res.status(400).json({ error: "Paste the conversation (at least 20 characters)." });
  if (text.length > 20000)
    return res.status(400).json({ error: "Conversation is too long (max 20,000 characters)." });

  let result;
  try {
    result = await analyzeRelationship(text);
  } catch (e) {
    console.error("relationship analyze failed:", e.message);
    return res.status(502).json({ error: "The detector is unavailable right now. Try again shortly." });
  }

  try {
    await Ai.createAnalysis({
      userId: req.user.id,
      inputText: text.slice(0, 5000),
      riskLevel: result.risk_level,
      explanation: result.summary || "Long-con analysis",
    });
  } catch (e) {
    console.error("save relationship analysis failed:", e.message);
  }

  const reward = await gamify.award(req.user.id, "relationship_check");
  return res.json({ ...result, reward });
}

module.exports = { analyze, history, relationship };
// <Shania End>
