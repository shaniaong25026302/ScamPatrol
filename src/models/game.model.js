// <Shania Start>
// src/models/game.model.js — database access for the gamification tables:
// game_profiles, xp_events, user_badges, game_scores, user_purchases.
// Called by src/services/gamification.service.js and src/controllers/game.controller.js.
const { pool } = require("../db"); // the shared MySQL pool, created in src/db.js

// Make sure a game profile row exists for this user. INSERT IGNORE = if the row already exists, do nothing (no error).
async function ensureProfile(userId) {
  await pool.query("INSERT IGNORE INTO game_profiles (user_id) VALUES (?)", [userId]); // safe to call every time
}

// Fetch a user's whole game profile (xp, coins, level, streaks, energy, avatar).
async function getProfile(userId) {
  const [rows] = await pool.query("SELECT * FROM game_profiles WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0] || null; // the profile row, or null if somehow missing
}

// Add XP and coins to a profile. `xp = xp + ?` increments the current value (atomic), so two awards can't overwrite each other.
async function addXp(userId, xp, coins) {
  await pool.query(
    "UPDATE game_profiles SET xp = xp + ?, coins = coins + ? WHERE user_id = ?",
    [xp, coins, userId],
  );
}

// Set a user's level number (called when they cross an XP threshold).
async function setLevel(userId, level) {
  await pool.query("UPDATE game_profiles SET level = ? WHERE user_id = ?", [level, userId]);
}

// Save the streak fields together: current streak, longest streak, and the last active date (YYYY-MM-DD).
async function setStreak(userId, current, longest, dateStr) {
  await pool.query(
    "UPDATE game_profiles SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE user_id = ?",
    [current, longest, dateStr, userId],
  );
}

// Append one row to xp_events — the append-only log of every reward (also acts as the points ledger).
async function logEvent(userId, action, xp, coins) {
  await pool.query(
    "INSERT INTO xp_events (user_id, action, xp, coins) VALUES (?, ?, ?, ?)",
    [userId, action, xp, coins],
  );
}

// Count how many times each action has happened for a user. Returns an object like { ai_check: 3, mission_correct: 5 }.
async function countByAction(userId) {
  const [rows] = await pool.query(
    "SELECT action, COUNT(*) AS n FROM xp_events WHERE user_id = ? GROUP BY action", // GROUP BY action + COUNT(*) = one count per action
    [userId],
  );
  const map = {}; // build the {action: count} object from the rows
  for (const r of rows) map[r.action] = Number(r.n); // Number(r.n) converts the SQL count to a JS number
  return map;
}

// Has the user done this action today? Used for once-a-day rewards. Returns true/false.
async function hasEventToday(userId, action) {
  const [rows] = await pool.query(
    "SELECT 1 FROM xp_events WHERE user_id = ? AND action = ? AND DATE(created_at) = CURDATE() LIMIT 1", // CURDATE() = today; DATE(...) strips the time
    [userId, action],
  );
  return rows.length > 0; // at least one matching row today = true
}

// Sum the coins already awarded today for one action — used to enforce the owl-poke daily cap.
async function coinsFromActionToday(userId, action) {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(coins), 0) AS c FROM xp_events WHERE user_id = ? AND action = ? AND DATE(created_at) = CURDATE()", // COALESCE(...,0) = use 0 if no rows
    [userId, action],
  );
  return Number(rows[0].c); // total coins from that action today
}

// Count how many times an action happened today — used to verify the daily challenge is actually done.
async function countActionToday(userId, action) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM xp_events WHERE user_id = ? AND action = ? AND DATE(created_at) = CURDATE()",
    [userId, action],
  );
  return Number(rows[0].n);
}

// List the badges a user has earned (with the time earned).
async function getBadges(userId) {
  const [rows] = await pool.query(
    "SELECT badge_key, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at",
    [userId],
  );
  return rows;
}

// Grant a badge. UNIQUE(user_id, badge_key) + INSERT IGNORE silently skips a badge they already have.
async function addBadge(userId, key) {
  const [r] = await pool.query(
    "INSERT IGNORE INTO user_badges (user_id, badge_key) VALUES (?, ?)",
    [userId, key],
  );
  return r.affectedRows > 0; // affectedRows = rows actually inserted; > 0 means it was NEW (so we only toast new badges)
}

// Record a mission/mini-game score row (e.g. game = "mn_Email" means an Email mission was cleared).
async function recordScore(userId, game, score) {
  await pool.query("INSERT INTO game_scores (user_id, game, score) VALUES (?, ?, ?)", [
    userId,
    game,
    score,
  ]);
}

// Build the leaderboard: top players ordered by XP (or by streak). Joins profiles to usernames.
async function leaderboard(type = "score", limit = 20) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100); // clamp limit to a safe integer 1–100
  const order = type === "streak" ? "gp.current_streak DESC, gp.xp DESC" : "gp.xp DESC"; // choose the sort column based on the tab
  const [rows] = await pool.query(
    `SELECT u.id AS user_id, u.username, gp.xp, gp.level, gp.coins, gp.current_streak
       FROM game_profiles gp JOIN users u ON u.id = gp.user_id
      ORDER BY ${order} LIMIT ${lim}`, // order + lim are validated values, safe to inline
  );
  return rows; // the ranked list
}

// Work out a single user's global rank = (how many players have MORE xp than them) + 1.
async function userRank(userId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) + 1 AS rnk FROM game_profiles
      WHERE xp > (SELECT xp FROM game_profiles WHERE user_id = ?)`, // subquery = this user's xp; count everyone above it
    [userId],
  );
  return Number(rows[0].rnk); // e.g. 3 = they're 3rd
}

// ---------- energy / avatar / shop ----------
// Save the current energy value and the timestamp it was last updated (needed for the hourly regen maths).
async function setEnergy(userId, energy, updatedAt) {
  await pool.query("UPDATE game_profiles SET energy = ?, energy_updated_at = ? WHERE user_id = ?", [energy, updatedAt, userId]);
}

// Set which avatar the user has equipped.
async function setAvatar(userId, key) {
  await pool.query("UPDATE game_profiles SET avatar = ? WHERE user_id = ?", [key, userId]);
}

// Spend coins SAFELY. The "AND coins >= ?" means the UPDATE only runs if they can afford it — so two
// simultaneous purchases can never push the balance negative. Returns true if the spend happened.
async function spendCoins(userId, amount) {
  const [r] = await pool.query(
    "UPDATE game_profiles SET coins = coins - ? WHERE user_id = ? AND coins >= ?",
    [amount, userId, amount],
  );
  return r.affectedRows > 0; // affectedRows > 0 = a row was updated = they had enough and it was deducted
}

// Record a shop purchase. UNIQUE(user_id, item_key) + INSERT IGNORE means owning the same item twice is impossible.
async function addPurchase(userId, key) {
  const [r] = await pool.query("INSERT IGNORE INTO user_purchases (user_id, item_key) VALUES (?, ?)", [userId, key]);
  return r.affectedRows > 0; // true = newly bought
}

// List the item keys a user owns.
async function getPurchases(userId) {
  const [rows] = await pool.query("SELECT item_key FROM user_purchases WHERE user_id = ?", [userId]);
  return rows.map((r) => r.item_key); // .map(...) turns [{item_key:'detective'}, …] into ['detective', …]
}

// Count cleared missions per "game" key (e.g. mn_Email). Drives the mission map + Boss-unlock logic.
async function scoreCounts(userId) {
  const [rows] = await pool.query("SELECT game, COUNT(*) AS n FROM game_scores WHERE user_id = ? GROUP BY game", [userId]);
  const m = {}; // { mn_Email: 2, mn_SMS: 1, ... }
  for (const r of rows) m[r.game] = Number(r.n);
  return m;
}

module.exports = { // exported to gamification.service.js + game.controller.js
  ensureProfile, getProfile, addXp, setLevel, setStreak, logEvent,
  countByAction, hasEventToday, coinsFromActionToday, countActionToday, getBadges, addBadge, recordScore,
  leaderboard, userRank,
  setEnergy, setAvatar, spendCoins, addPurchase, getPurchases, scoreCounts,
};
// <Shania End>
