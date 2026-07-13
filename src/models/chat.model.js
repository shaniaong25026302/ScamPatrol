// Shawn Start
const { pool } = require("../db");

// Create a new chat session
async function createSession(userId, title = "New Chat") {
    const [result] = await pool.query(
        `INSERT INTO chat_sessions (user_id, title)
         VALUES (?, ?)`,
        [userId, title]
    );

    return result.insertId;
}

// Get all sessions for a user
async function getSessions(userId) {
    const [rows] = await pool.query(
        `SELECT *
         FROM chat_sessions
         WHERE user_id = ?
         ORDER BY is_pinned DESC, updated_at DESC`,
        [userId]
    );

    return rows;
}

// Get one session
async function getSession(id) {
    const [rows] = await pool.query(
        `SELECT *
         FROM chat_sessions
         WHERE id = ?`
        ,
        [id]
    );

    return rows[0];
}

// Save a message
async function saveMessage(sessionId, role, message) {
    await pool.query(
        `INSERT INTO chat_messages
        (session_id, role, message)
        VALUES (?, ?, ?)`,
        [sessionId, role, message]
    );

    await pool.query(
        `UPDATE chat_sessions
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [sessionId]
    );
}

// Load messages
async function getMessages(sessionId) {
    const [rows] = await pool.query(
        `SELECT role, message
         FROM chat_messages
         WHERE session_id = ?
         ORDER BY created_at ASC`,
        [sessionId]
    );

    return rows;
}

// Pin / unpin
async function pinSession(id, pinned) {
    await pool.query(
        `UPDATE chat_sessions
         SET is_pinned = ?
         WHERE id = ?`,
        [pinned, id]
    );
}

module.exports = {
    createSession,
    getSessions,
    getSession,
    saveMessage,
    getMessages,
    pinSession
};
// Shawn End