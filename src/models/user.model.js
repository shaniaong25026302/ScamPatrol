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

// <Shawn Start>
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

// Shawn Admin/User Panel for User Management
async function updateRole(id, role) {

    await pool.query(
        "UPDATE users SET role = ? WHERE id = ?",
        [role, id]
    );

}
// <Shawn End>

// <CG Start>
async function getUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, username, email, avatar_url, bio
     FROM users
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
}

async function updateUserProfile(id, { username, email, bio, avatar_url }) {
  await pool.query(
    `UPDATE users
     SET username = ?,
         email = ?,
         bio = ?,
         avatar_url = ?
     WHERE id = ?`,
    [username, email, bio, avatar_url, id]
  );
}
// <CG End>


module.exports = {
  findByEmail,
  findByUsername,
  findPublicById,
  createUser,
  updatePassword,
  createReset,
  findReset,
  deleteResetsForUser,
  // <Shawn Start>
  getAllUsers, //Shawn Admin Panel for User Management
  updateRole, //Shawn Admin/User Panel for User Management
  // <Shawn End>
    // <CG Start>
  getUserById,
  updateUserProfile
  // <CG End> 
};
// <Shania End>
