// <Shania Start>
// src/models/game.model.js — gamification data access (profiles, XP events, badges, scores).
const { pool } = require("../db");

async function ensureProfile(userId) {
  await pool.query("INSERT IGNORE INTO game_profiles (user_id) VALUES (?)", [userId]);
}

async function getProfile(userId) {
  const [rows] = await pool.query("SELECT * FROM game_profiles WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0] || null;
}

async function addXp(userId, xp, coins) {
  await pool.query(
    "UPDATE game_profiles SET xp = xp + ?, coins = coins + ? WHERE user_id = ?",
    [xp, coins, userId],
  );
}

async function setLevel(userId, level) {
  await pool.query("UPDATE game_profiles SET level = ? WHERE user_id = ?", [level, userId]);
}

async function setStreak(userId, current, longest, dateStr) {
  await pool.query(
    "UPDATE game_profiles SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE user_id = ?",
    [current, longest, dateStr, userId],
  );
}

async function logEvent(userId, action, xp, coins) {
  await pool.query(
    "INSERT INTO xp_events (user_id, action, xp, coins) VALUES (?, ?, ?, ?)",
    [userId, action, xp, coins],
  );
}

async function countByAction(userId) {
  const [rows] = await pool.query(
    "SELECT action, COUNT(*) AS n FROM xp_events WHERE user_id = ? GROUP BY action",
    [userId],
  );
  const map = {};
  for (const r of rows) map[r.action] = Number(r.n);
  return map;
}

async function hasEventToday(userId, action) {
  const [rows] = await pool.query(
    "SELECT 1 FROM xp_events WHERE user_id = ? AND action = ? AND DATE(created_at) = CURDATE() LIMIT 1",
    [userId, action],
  );
  return rows.length > 0;
}

// Total coins already awarded today for a given action (used for daily caps).
async function coinsFromActionToday(userId, action) {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(coins), 0) AS c FROM xp_events WHERE user_id = ? AND action = ? AND DATE(created_at) = CURDATE()",
    [userId, action],
  );
  return Number(rows[0].c);
}

async function getBadges(userId) {
  const [rows] = await pool.query(
    "SELECT badge_key, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at",
    [userId],
  );
  return rows;
}

async function addBadge(userId, key) {
  const [r] = await pool.query(
    "INSERT IGNORE INTO user_badges (user_id, badge_key) VALUES (?, ?)",
    [userId, key],
  );
  return r.affectedRows > 0; // true = newly granted
}

async function recordScore(userId, game, score) {
  await pool.query("INSERT INTO game_scores (user_id, game, score) VALUES (?, ?, ?)", [
    userId,
    game,
    score,
  ]);
}

async function leaderboard(type = "score", limit = 20) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const order = type === "streak" ? "gp.current_streak DESC, gp.xp DESC" : "gp.xp DESC";
  const [rows] = await pool.query(
    `SELECT u.id AS user_id, u.username, gp.xp, gp.level, gp.coins, gp.current_streak
       FROM game_profiles gp JOIN users u ON u.id = gp.user_id
      ORDER BY ${order} LIMIT ${lim}`,
  );
  return rows;
}

async function userRank(userId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) + 1 AS rnk FROM game_profiles
      WHERE xp > (SELECT xp FROM game_profiles WHERE user_id = ?)`,
    [userId],
  );
  return Number(rows[0].rnk);
}

// ---------- energy / avatar / shop ----------
async function setEnergy(userId, energy, updatedAt) {
  await pool.query("UPDATE game_profiles SET energy = ?, energy_updated_at = ? WHERE user_id = ?", [energy, updatedAt, userId]);
}

async function setAvatar(userId, key) {
  await pool.query("UPDATE game_profiles SET avatar = ? WHERE user_id = ?", [key, userId]);
}

async function spendCoins(userId, amount) {
  const [r] = await pool.query(
    "UPDATE game_profiles SET coins = coins - ? WHERE user_id = ? AND coins >= ?",
    [amount, userId, amount],
  );
  return r.affectedRows > 0; // atomic: false if not enough coins
}

async function addPurchase(userId, key) {
  const [r] = await pool.query("INSERT IGNORE INTO user_purchases (user_id, item_key) VALUES (?, ?)", [userId, key]);
  return r.affectedRows > 0;
}

async function getPurchases(userId) {
  const [rows] = await pool.query("SELECT item_key FROM user_purchases WHERE user_id = ?", [userId]);
  return rows.map((r) => r.item_key);
}

async function scoreCounts(userId) {
  const [rows] = await pool.query("SELECT game, COUNT(*) AS n FROM game_scores WHERE user_id = ? GROUP BY game", [userId]);
  const m = {};
  for (const r of rows) m[r.game] = Number(r.n);
  return m;
}

module.exports = {
  ensureProfile, getProfile, addXp, setLevel, setStreak, logEvent,
  countByAction, hasEventToday, coinsFromActionToday, getBadges, addBadge, recordScore,
  leaderboard, userRank,
  setEnergy, setAvatar, spendCoins, addPurchase, getPurchases, scoreCounts,
};
// <Shania End>
