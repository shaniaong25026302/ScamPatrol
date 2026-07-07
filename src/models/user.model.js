// <Shania Start>
// src/models/user.model.js — all database access for the `users` and `password_resets` tables.
// Called by src/controllers/auth.controller.js. Keeping SQL in the model keeps controllers clean.
const { pool } = require("../db"); // the shared MySQL pool, created in src/db.js; pool.query runs SQL

const PUBLIC_FIELDS = "id, username, email, role, avatar_url, bio, created_at"; // safe columns to return — deliberately NO password_hash

// Find one user by email. Returns the row, or null if no match.
async function findByEmail(email) {
  // await = pause until the DB replies. [rows] = the data part of mysql2's [rows, fields] result.
  // SQL: read every column from `users` where email matches the ? (filled by [email], which blocks SQL injection); LIMIT 1 = at most one row.
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] || null; // first row, or null if the array was empty
}

// Find one user by username (used to check the name isn't already taken).
async function findByUsername(username) {
  const [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]); // same pattern, matching username
  return rows[0] || null;
}

// Find a user by id, returning ONLY the safe public columns (for sending to the browser).
async function findPublicById(id) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ? LIMIT 1`, // ${PUBLIC_FIELDS} = our safe column list (a constant, not user input)
    [id],
  );
  return rows[0] || null;
}

// Insert a new user; returns the id MySQL assigns to the new row.
async function createUser({ username, email, passwordHash }) {
  const [result] = await pool.query(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", // store passwordHash (a bcrypt hash), never the plain password
    [username, email, passwordHash], // the three ?s are filled in this order
  );
  return result.insertId; // insertId = the new row's auto-increment id
}

// Change a user's password hash (last step of a password reset).
async function updatePassword(userId, passwordHash) {
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]); // update only the row with this id
}

// ---------- password_resets ----------
// Save a one-time reset token for a user, with when it expires.
async function createReset(userId, token, expiresAt) {
  await pool.query(
    "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt],
  );
}

// Look up a reset token (to validate a reset link). Returns the row or null.
async function findReset(token) {
  const [rows] = await pool.query("SELECT * FROM password_resets WHERE token = ? LIMIT 1", [token]);
  return rows[0] || null;
}

// Delete all reset tokens for a user (makes old links single-use / invalid).
async function deleteResetsForUser(userId) {
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);
}

//Shawn Admin Panel for User Management
async function getAllUsers() {
  const [rows] = await pool.query(`
    SELECT
      id,
      username,
      email,
      role,
      created_at
    FROM users
    ORDER BY created_at DESC
  `);

  return rows;
}

module.exports = { // exported to auth.controller.js
  findByEmail,
  findByUsername,
  findPublicById,
  createUser,
  updatePassword,
  createReset,
  findReset,
  deleteResetsForUser,
  getAllUsers //Shawn Admin Panel for User Management
};
// <Shania End>
