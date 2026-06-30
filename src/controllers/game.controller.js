// <Shania Start>
// src/controllers/game.controller.js — Scam Patrol HQ API (profile, leaderboard, missions, roast, challenge).
const Game = require("../models/game.model");
const gamify = require("../services/gamification.service");
const missions = require("../data/missions");
const { roastScam } = require("../services/gemini.service");

const MIN = 10;
const MAX = 10000;

// Onboarding quest steps, computed from real activity (no extra table).
function questSteps(counts, profile) {
  return [
    { key: "register", label: "Create your account", done: true },
    { key: "first_scan", label: "Run your first analysis", done: (counts.ai_check || 0) >= 1 },
    { key: "first_mission", label: "Clear a field mission", done: (counts.mission_correct || 0) >= 1 },
    { key: "level2", label: "Reach Level 2", done: (profile.level || 1) >= 2 },
  ];
}

// Daily challenge: rotates by date; "done" if completed today.
function todaysChallenge() {
  const pool = [
    { key: "check3", label: "Analyze 3 messages today", icon: "🔍" },
    { key: "mission3", label: "Clear 3 field missions today", icon: "🎯" },
    { key: "roast1", label: "Roast a scam today", icon: "🔥" },
  ];
  const day = Math.floor(Date.now() / 86400000);
  return pool[day % pool.length];
}

// GET /api/game/profile  (requireAuth)
async function profile(req, res) {
  await Game.ensureProfile(req.user.id);
  const p = await Game.getProfile(req.user.id);
  const info = gamify.levelInfo(p.xp);
  const counts = await Game.countByAction(req.user.id);
  const badgeRows = await Game.getBadges(req.user.id);
  const earned = new Set(badgeRows.map((b) => b.badge_key));
  const badges = gamify.BADGES.map((b) => ({
    key: b.key, name: b.name, icon: b.icon, desc: b.desc, earned: earned.has(b.key),
  }));
  const rank = await Game.userRank(req.user.id);
  const challenge = todaysChallenge();
  return res.json({
    username: req.user.username,
    xp: p.xp, coins: p.coins, level: info.level, rank: info.rank,
    intoLevel: info.intoLevel, span: info.span, toNext: info.toNext,
    streak: p.current_streak, longestStreak: p.longest_streak,
    leaderboardRank: rank,
    badges,
    quest: questSteps(counts, p),
    challenge: { ...challenge, done: await Game.hasEventToday(req.user.id, "daily_challenge") },
    stats: counts,
  });
}

// GET /api/game/leaderboard?type=score|streak
async function leaderboard(req, res) {
  const type = req.query.type === "streak" ? "streak" : "score";
  const rows = await Game.leaderboard(type, 20);
  const me = req.user ? req.user.id : null;
  return res.json({
    type,
    leaders: rows.map((r, i) => ({
      position: i + 1,
      username: r.username,
      xp: r.xp,
      level: r.level,
      streak: r.current_streak,
      isMe: r.user_id === me,
    })),
  });
}

// GET /api/game/mission — a random Spot-the-Scam mission (answer hidden)
async function mission(req, res) {
  const m = missions.randomMission();
  return res.json({ mission: missions.publicMission(m) });
}

// POST /api/game/mission/check { missionId, answer }
async function missionCheck(req, res) {
  const { missionId, answer } = req.body || {};
  const m = missions.byId(missionId);
  if (!m) return res.status(400).json({ error: "Unknown mission." });
  const correct = String(answer).toLowerCase() === m.answer;

  let reward = null;
  if (req.user) {
    reward = await gamify.award(req.user.id, correct ? "mission_correct" : "mission_wrong");
    if (correct) await Game.recordScore(req.user.id, "missions", 1);
  }
  return res.json({ correct, answer: m.answer, why: m.why, reward });
}

// POST /api/game/roast { text }
async function roast(req, res) {
  const { text } = req.body || {};
  if (!text || text.trim().length < MIN) return res.status(400).json({ error: `Paste at least ${MIN} characters.` });
  if (text.length > MAX) return res.status(400).json({ error: `Max ${MAX} characters.` });

  let result;
  try {
    result = await roastScam(text);
  } catch (e) {
    console.error("roast failed:", e.message);
    return res.status(502).json({ error: "The roaster is warming up — try again." });
  }
  let reward = null;
  if (req.user) reward = await gamify.award(req.user.id, "roast");
  return res.json({ ...result, reward });
}

// POST /api/game/challenge/complete — marks today's daily challenge done (idempotent)
async function completeChallenge(req, res) {
  if (await Game.hasEventToday(req.user.id, "daily_challenge")) {
    return res.json({ alreadyDone: true });
  }
  const reward = await gamify.award(req.user.id, "daily_challenge");
  return res.json({ reward });
}

// POST /api/game/story/complete — one-time XP for finishing the origin story.
async function storyComplete(req, res) {
  if (!req.user) return res.json({ guest: true });
  const counts = await Game.countByAction(req.user.id);
  if (counts.story_win) return res.json({ already: true });
  const reward = await gamify.award(req.user.id, "story_win");
  return res.json({ reward });
}

module.exports = { profile, leaderboard, mission, missionCheck, roast, completeChallenge, storyComplete };
// <Shania End>
