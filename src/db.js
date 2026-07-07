// <Shania Start>
// src/db.js — creates ONE shared MySQL connection pool for the whole app.
// Every model file imports `pool` from here and calls pool.query(...).
const mysql = require("mysql2/promise"); // the MySQL driver, promise version so we can use async/await

// A pool keeps a few database connections open and reuses them, instead of opening a new
// connection for every query (which would be slow and quickly hit the host's connection limit).
const pool = mysql.createPool({
  host: process.env.DB_HOST, // DB server address — read from .env
  port: Number(process.env.DB_PORT) || 3306, // DB port; Number(...) converts the env string to a number, default 3306
  user: process.env.DB_USER, // DB username — from .env
  password: process.env.DB_PASSWORD, // DB password — from .env (never hard-coded)
  database: process.env.DB_NAME, // which database/schema to use — from .env
  waitForConnections: true, // if every connection is busy, WAIT (queue) instead of throwing an error
  // [DevOps: Resource management] filess.io free tier caps total connections at 5, so we keep the
  // pool small and release idle connections fast so a restart / 2nd instance isn't locked out.
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 4, // max simultaneous connections
  maxIdle: 2, // keep at most 2 spare idle connections
  idleTimeout: 30000, // close an idle connection after 30000 ms (30s) to free it
  enableKeepAlive: true, // periodically ping idle connections so they don't silently drop
  queueLimit: 0, // 0 = no limit on how many queries can wait for a free connection
  charset: "utf8mb4_general_ci", // character set — utf8mb4 supports full Unicode incl. emoji
});

// ping() — a tiny "is the database alive?" check, used by GET /api/health in src/server.js.
async function ping() {
  const conn = await pool.getConnection(); // await = wait until the pool hands us a free connection
  try {
    await conn.query("SELECT 1"); // the cheapest possible query; only succeeds if the DB is reachable
    return true; // got here = the DB answered = healthy
  } finally {
    conn.release(); // finally = ALWAYS run this — give the connection back to the pool, even if the query threw
  }
}

module.exports = { pool, ping }; // export pool (used by every model) and ping (used by the health check)
// <Shania End>
