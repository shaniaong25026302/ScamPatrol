// <Shania Start>
// src/db.js — shared MySQL connection pool (mysql2/promise).
// Every model/controller imports `pool` from here. One pool per process.
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  // Filess.io free tier caps concurrent connections at 5 — keep the pool small AND
  // release idle connections quickly so restarts/other tools aren't locked out.
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 4,
  maxIdle: 2,
  idleTimeout: 30000, // close idle connections after 30s to free the host's cap
  enableKeepAlive: true,
  queueLimit: 0,
  charset: "utf8mb4_general_ci",
});

// Lightweight connectivity probe used by GET /api/health.
async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SELECT 1");
    return true;
  } finally {
    conn.release();
  }
}

module.exports = { pool, ping };
// <Shania End>
