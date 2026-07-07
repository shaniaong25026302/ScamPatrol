// <Shania Start>
// src/controllers/ai.controller.js — the logic behind /api/ai/* (routed in src/routes/ai.routes.js). Login required.
const Ai = require("../models/ai.model"); // save/read analyses — src/models/ai.model.js
const { analyzeText, analyzeRelationship, chatReply } = require("../services/gemini.service"); // Gemini calls — gemini.service.js
const gamify = require("../services/gamification.service"); // gamify.award() — gamification.service.js

const MIN_LEN = 10; // shortest message we'll analyse
const MAX_LEN = 10000; // longest message we'll analyse

// Validate the analyse input. Returns an error string, or null if OK.
function validateInput(text) {
  if (typeof text !== "string" || !text.trim()) return "Enter a message to check."; // missing / all-whitespace
  if (text.trim().length < MIN_LEN) return `Message must be at least ${MIN_LEN} characters.`; // too short
  if (text.length > MAX_LEN) return `Message must be ${MAX_LEN} characters or fewer.`; // too long
  return null;
}

// POST /api/ai/analyze — run the scam checker on one message.
async function analyze(req, res) {
  const { text } = req.body || {}; // the message to check
  const err = validateInput(text);
  if (err) return res.status(400).json({ error: err }); // bad input → 400

  let result;
  try {
    result = await analyzeText(text); // await the AI (returns {risk_level, explanation, signals})
  } catch (e) {
    console.error("Gemini analyze failed:", e.message);
    return res.status(502).json({ error: "The AI checker is temporarily unavailable. Please try again shortly." }); // 502 = a service WE depend on failed
  }

  try {
    await Ai.createAnalysis({ // save the result to the user's history
      userId: req.user.id,
      inputText: text,
      riskLevel: result.risk_level,
      explanation: result.explanation,
    });
  } catch (e) {
    console.error("Saving analysis failed:", e.message); // saving is best-effort — a DB hiccup shouldn't fail the whole request
  }

  const reward = await gamify.award(req.user.id, "ai_check"); // base XP for analysing
  if (result.risk_level === "high") await gamify.award(req.user.id, "high_risk_caught"); // bonus XP for catching a high-risk scam
  return res.json({ ...result, saved: true, reward }); // ...result spreads the AI fields; add saved + reward
}

// GET /api/ai/history — the user's recent checks.
async function history(req, res) {
  const rows = await Ai.historyForUser(req.user.id, 20); // last 20
  return res.json({ history: rows });
}

// POST /api/ai/relationship — long-con / romance scam timeline mapper.
async function relationship(req, res) {
  const { text } = req.body || {};
  if (typeof text !== "string" || text.trim().length < 20) // needs at least a short conversation
    return res.status(400).json({ error: "Paste the conversation (at least 20 characters)." });
  if (text.length > 20000)
    return res.status(400).json({ error: "Conversation is too long (max 20,000 characters)." });

  let result;
  try {
    result = await analyzeRelationship(text); // map the manipulation timeline
  } catch (e) {
    console.error("relationship analyze failed:", e.message);
    return res.status(502).json({ error: "The detector is unavailable right now. Try again shortly." });
  }

  try {
    await Ai.createAnalysis({ // save a summary
      userId: req.user.id,
      inputText: text.slice(0, 5000), // slice(0,5000) = keep only the first 5000 characters
      riskLevel: result.risk_level,
      explanation: result.summary || "Long-con analysis",
    });
  } catch (e) {
    console.error("save relationship analysis failed:", e.message);
  }

  const reward = await gamify.award(req.user.id, "relationship_check"); // XP for using the detector
  return res.json({ ...result, reward });
}

// POST /api/ai/chat — the "Ask Inspector Hoot" chatbot. Body: { messages: [{ role, text }] } = the whole conversation.
const MAX_CHAT_MSGS = 20; // only keep the last 20 messages of context (controls cost + token limits)
async function chat(req, res) {
  const raw = Array.isArray((req.body || {}).messages) ? req.body.messages : null; // messages must be an array
  if (!raw || !raw.length) return res.status(400).json({ error: "Send a message." });

  const messages = raw
    .slice(-MAX_CHAT_MSGS) // slice(-20) = keep only the LAST 20 items
    .map((m) => ({ // normalise each message
      role: m && m.role === "assistant" ? "assistant" : "user", // only "assistant" or "user" (default user)
      text: String((m && m.text) || "").slice(0, 2000), // force to string, cap each at 2000 chars
    }))
    .filter((m) => m.text.trim()); // drop any empty messages

  if (!messages.length || messages[messages.length - 1].role !== "user") // the newest message must be from the user
    return res.status(400).json({ error: "Send a message." });

  let reply;
  try {
    reply = await chatReply(messages); // ask Gemini (with Inspector Hoot's system prompt)
  } catch (e) {
    console.error("chat failed:", e.message);
    return res.status(502).json({ error: "Inspector Hoot is unavailable right now. Try again shortly." });
  }
  return res.json({ reply }); // send the bot's reply back
}

module.exports = { analyze, history, relationship, chat }; // used by src/routes/ai.routes.js
// <Shania End>
