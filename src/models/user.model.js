// <Shania Start>
// src/models/user.model.js — users + password_resets data access.
const { pool } = require("../db");

const PUBLIC_FIELDS = "id, username, email, role, avatar_url, bio, created_at";

async function findByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] || null;
}

async function findByUsername(username) {
  const [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
  return rows[0] || null;
}

async function findPublicById(id) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function createUser({ username, email, passwordHash }) {
  const [result] = await pool.query(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    [username, email, passwordHash],
  );
  return result.insertId;
}

async function updatePassword(userId, passwordHash) {
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
}

// ---------- password_resets ----------
async function createReset(userId, token, expiresAt) {
  await pool.query(
    "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt],
  );
}

async function findReset(token) {
  const [rows] = await pool.query(
    "SELECT * FROM password_resets WHERE token = ? LIMIT 1",
    [token],
  );
  return rows[0] || null;
}

async function deleteResetsForUser(userId) {
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);
}

module.exports = {
  findByEmail,
  findByUsername,
  findPublicById,
  createUser,
  updatePassword,
  createReset,
  findReset,
  deleteResetsForUser,
};
// <Shania End>
