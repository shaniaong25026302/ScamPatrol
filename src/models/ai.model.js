// src/models/ai.model.js — ai_analyses data access.
const { pool } = require("../db");

async function createAnalysis({ userId = null, inputText, riskLevel, explanation }) {
  const [result] = await pool.query(
    "INSERT INTO ai_analyses (user_id, input_text, risk_level, explanation) VALUES (?, ?, ?, ?)",
    [userId, inputText, riskLevel, explanation],
  );
  return result.insertId;
}

async function historyForUser(userId, limit = 20) {
  // LIMIT can't be a bound param on all MySQL versions — sanitise to an int and inline.
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const [rows] = await pool.query(
    `SELECT id, input_text, risk_level, explanation, created_at
       FROM ai_analyses
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ${lim}`,
    [userId],
  );
  return rows;
}

module.exports = { createAnalysis, historyForUser };
