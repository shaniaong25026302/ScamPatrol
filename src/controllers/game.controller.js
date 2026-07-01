// <Shania Start>
// src/controllers/game.controller.js — Scam Patrol HQ API (profile, leaderboard, missions, roast, challenge).
const Game = require("../models/game.model");
const gamify = require("../services/gamification.service");
const missions = require("../data/missions");
const shop = require("../data/shop");
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

// Energy: read current (persisting hourly regen) and spend 1 for a mission run.
async function readEnergy(userId) {
  await Game.ensureProfile(userId);
  const p = await Game.getProfile(userId);
  const e = gamify.computeEnergy(p);
  if (e.changed) await Game.setEnergy(userId, e.energy, e.updatedAt);
  return e;
}
async function spendEnergy(userId) {
  const e = await readEnergy(userId);
  if (e.energy < 1) return { ok: false, energy: 0, max: e.max, nextSec: e.nextSec };
  const wasFull = e.energy >= gamify.MAX_ENERGY;
  const updatedAt = wasFull ? new Date() : e.updatedAt;
  const newEnergy = e.energy - 1;
  await Game.setEnergy(userId, newEnergy, updatedAt);
  const after = gamify.computeEnergy({ energy: newEnergy, energy_updated_at: updatedAt });
  return { ok: true, energy: after.energy, max: after.max, nextSec: after.nextSec };
}

// Field-mission map progress (stars + Boss unlock) from per-kind clear counts.
// Boss unlocks once EACH non-Boss stage has been cleared at least once; clearing the
// same stage again does not count toward the requirement (distinct stages only).
function missionsProgress(sc) {
  const nonBoss = missions.KINDS.filter((k) => k !== "Boss");
  const needed = nonBoss.length;
  const distinctCleared = nonBoss.filter((k) => (sc["mn_" + k] || 0) >= 1).length;
  return missions.KINDS.map((kind) => {
    const cleared = sc["mn_" + kind] || 0;
    const stars = cleared >= 5 ? 3 : cleared >= 3 ? 2 : cleared >= 1 ? 1 : 0;
    return { kind, cleared, stars, locked: kind === "Boss" && distinctCleared < needed };
  });
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
  const energy = await readEnergy(req.user.id);
  const sc = await Game.scoreCounts(req.user.id);
  const avatarImg = (shop.byKey(p.avatar) || {}).img || "/img/avatars/recruit.png";
  return res.json({
    username: req.user.username,
    xp: p.xp, coins: p.coins, level: info.level, rank: info.rank,
    intoLevel: info.intoLevel, span: info.span, toNext: info.toNext,
    streak: p.current_streak, longestStreak: p.longest_streak,
    energy: energy.energy, energyMax: energy.max, energyNextSec: energy.nextSec,
    avatar: p.avatar, avatarImg,
    leaderboardRank: rank,
    badges,
    quest: questSteps(counts, p),
    challenge: { ...challenge, done: await Game.hasEventToday(req.user.id, "daily_challenge") },
    missions: missionsProgress(sc),
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

// POST /api/game/mission/start { kind } — costs 1 energy; returns a mission of that kind
async function missionStart(req, res) {
  const kind = (req.body && req.body.kind) || null;
  const spent = await spendEnergy(req.user.id);
  if (!spent.ok) {
    return res.status(403).json({ noEnergy: true, energy: 0, energyMax: spent.max, energyNextSec: spent.nextSec });
  }
  const m = kind ? missions.randomByKind(kind) : missions.randomMission();
  return res.json({
    mission: missions.publicMission(m),
    energy: spent.energy, energyMax: spent.max, energyNextSec: spent.nextSec,
  });
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
    if (correct) await Game.recordScore(req.user.id, "mn_" + m.kind, 1);
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

// POST /api/game/poke — coins for poking Inspector Hoot, capped at 10 coins/day.
const POKE_DAILY_CAP = 10;
const POKE_PER_HIT = 2;
async function pokeReward(req, res) {
  await Game.ensureProfile(req.user.id);
  const awardedToday = await Game.coinsFromActionToday(req.user.id, "owl_poke");
  const remainingBefore = Math.max(0, POKE_DAILY_CAP - awardedToday);
  if (remainingBefore <= 0) {
    const p = await Game.getProfile(req.user.id);
    return res.json({ awarded: 0, limit: true, remaining: 0, coins: p ? p.coins : 0, cap: POKE_DAILY_CAP });
  }
  const award = Math.min(POKE_PER_HIT, remainingBefore);
  await Game.addXp(req.user.id, 0, award); // coins only, no XP
  await Game.logEvent(req.user.id, "owl_poke", 0, award);
  const p = await Game.getProfile(req.user.id);
  const remaining = remainingBefore - award;
  return res.json({ awarded: award, limit: remaining <= 0, remaining, coins: p.coins, cap: POKE_DAILY_CAP });
}

// GET /api/game/shop
async function getShop(req, res) {
  const p = await Game.getProfile(req.user.id);
  const owned = new Set(await Game.getPurchases(req.user.id));
  owned.add("recruit");
  return res.json({
    coins: p ? p.coins : 0,
    equipped: p ? p.avatar : "recruit",
    items: shop.ITEMS.map((i) => ({ key: i.key, name: i.name, price: i.price, img: i.img, desc: i.desc, owned: owned.has(i.key) })),
  });
}

// POST /api/game/shop/buy { key }
async function buyItem(req, res) {
  const item = shop.byKey((req.body || {}).key);
  if (!item) return res.status(400).json({ error: "Unknown item." });
  const owned = new Set(await Game.getPurchases(req.user.id));
  owned.add("recruit");
  if (owned.has(item.key)) return res.json({ alreadyOwned: true });
  if (item.price > 0) {
    const ok = await Game.spendCoins(req.user.id, item.price);
    if (!ok) return res.status(400).json({ error: "Not enough gold." });
  }
  await Game.addPurchase(req.user.id, item.key);
  const p = await Game.getProfile(req.user.id);
  return res.json({ bought: true, coins: p.coins, key: item.key });
}

// POST /api/game/shop/equip { key }
async function equipItem(req, res) {
  const item = shop.byKey((req.body || {}).key);
  if (!item) return res.status(400).json({ error: "Unknown item." });
  const owned = new Set(await Game.getPurchases(req.user.id));
  owned.add("recruit");
  if (!owned.has(item.key)) return res.status(400).json({ error: "You don't own that yet." });
  await Game.setAvatar(req.user.id, item.key);
  return res.json({ equipped: item.key, img: item.img });
}

// POST /api/game/story/complete — one-time XP for finishing the origin story.
async function storyComplete(req, res) {
  if (!req.user) return res.json({ guest: true });
  const counts = await Game.countByAction(req.user.id);
  if (counts.story_win) return res.json({ already: true });
  const reward = await gamify.award(req.user.id, "story_win");
  return res.json({ reward });
}

module.exports = {
  profile, leaderboard, missionStart, missionCheck, roast, completeChallenge, storyComplete,
  getShop, buyItem, equipItem, pokeReward,
};
// <Shania End>
