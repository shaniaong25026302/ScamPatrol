// <Shania Start>
// src/models/ai.model.js — database access for the `ai_analyses` table (saved scam checks).
// Called by src/controllers/ai.controller.js.
const { pool } = require("../db"); // the shared MySQL pool, created in src/db.js

// Save one analysis result. Returns the new row's id.
async function createAnalysis({ userId = null, inputText, riskLevel, explanation }) {
  // await = wait for the DB. INSERT a row; the four ?s are filled in order by the array below.
  const [result] = await pool.query(
    "INSERT INTO ai_analyses (user_id, input_text, risk_level, explanation) VALUES (?, ?, ?, ?)",
    [userId, inputText, riskLevel, explanation],
  );
  return result.insertId; // the id MySQL gave the new row
}

// Return a user's recent analyses, newest first.
async function historyForUser(userId, limit = 20) {
  // LIMIT can't always be a ? placeholder, so we force `limit` to a safe integer and inline it.
  // parseInt(limit,10) = base-10 integer; || 20 = fallback; Math.max(...,1) = at least 1; Math.min(...,100) = at most 100.
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const [rows] = await pool.query(
    `SELECT id, input_text, risk_level, explanation, created_at
       FROM ai_analyses
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ${lim}`, // safe to inline: lim is a validated number, never raw user text
    [userId],
  );
  return rows; // an array of the user's past checks
}

module.exports = { createAnalysis, historyForUser }; // exported to ai.controller.js
// <Shania End>
