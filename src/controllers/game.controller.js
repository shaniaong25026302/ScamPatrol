// <Shania Start>
// src/controllers/game.controller.js — the logic behind /api/game/* (routed in src/routes/game.routes.js).
// This is where all the game RULES are enforced on the server (energy, Boss lock, daily caps, anti-cheat).
const Game = require("../models/game.model"); // DB access — src/models/game.model.js
const gamify = require("../services/gamification.service"); // award/levelInfo/computeEnergy/BADGES — gamification.service.js
const missions = require("../data/missions"); // static mission content — src/data/missions.js
const shop = require("../data/shop"); // static shop catalogue — src/data/shop.js
const { roastScam } = require("../services/gemini.service"); // AI roast — gemini.service.js

const MIN = 10; // min length for the roast input
const MAX = 10000; // max length

// Build the onboarding quest checklist from the user's real activity counts (no separate table needed).
function questSteps(counts, profile) {
  return [
    { key: "register", label: "Create your account", done: true }, // always done — they're logged in
    { key: "first_scan", label: "Run your first analysis", done: (counts.ai_check || 0) >= 1 }, // ran the checker at least once?
    { key: "first_mission", label: "Clear a field mission", done: (counts.mission_correct || 0) >= 1 },
    { key: "level2", label: "Reach Level 2", done: (profile.level || 1) >= 2 },
  ];
}

// Each daily challenge maps to a real action + a target count, so the reward can't be claimed without doing it.
const CHALLENGE_REQ = {
  check3: { action: "ai_check", n: 3 }, // analyse 3 messages
  mission3: { action: "mission_correct", n: 3 }, // clear 3 missions
  roast1: { action: "roast", n: 1 }, // roast 1 scam
};
// Pick today's challenge — rotates through the pool by day number so everyone gets the same one each day.
function todaysChallenge() {
  const pool = [
    { key: "check3", label: "Analyze 3 messages today", icon: "🔍" },
    { key: "mission3", label: "Clear 3 field missions today", icon: "🎯" },
    { key: "roast1", label: "Roast a scam today", icon: "🔥" },
  ];
  const day = Math.floor(Date.now() / 86400000); // 86400000 ms = 1 day → whole days since 1970
  return pool[day % pool.length]; // % (remainder) cycles 0,1,2,0,1,2… through the pool
}

// Read the user's current energy (applying the hourly regen and saving it if it changed).
async function readEnergy(userId) {
  await Game.ensureProfile(userId);
  const p = await Game.getProfile(userId);
  const e = gamify.computeEnergy(p); // gamification.service — figures out regen since last update
  if (e.changed) await Game.setEnergy(userId, e.energy, e.updatedAt); // persist if it regenerated
  return e; // { energy, max, nextSec, ... }
}
// Spend 1 energy to start a mission. Returns { ok:false } if they have none.
async function spendEnergy(userId) {
  const e = await readEnergy(userId); // current energy after regen
  if (e.energy < 1) return { ok: false, energy: 0, max: e.max, nextSec: e.nextSec }; // empty
  const wasFull = e.energy >= gamify.MAX_ENERGY; // were they at the cap?
  const updatedAt = wasFull ? new Date() : e.updatedAt; // if leaving "full", the regen clock starts NOW
  const newEnergy = e.energy - 1; // spend one
  await Game.setEnergy(userId, newEnergy, updatedAt); // save it
  const after = gamify.computeEnergy({ energy: newEnergy, energy_updated_at: updatedAt }); // recompute nextSec
  return { ok: true, energy: after.energy, max: after.max, nextSec: after.nextSec };
}

// Build the mission-map state. The Boss unlocks only when EACH non-Boss type has been cleared at least once.
function missionsProgress(sc) {
  const nonBoss = missions.KINDS.filter((k) => k !== "Boss"); // ["Email","SMS","Website","Call"]
  const needed = nonBoss.length; // 4 types to clear
  const distinctCleared = nonBoss.filter((k) => (sc["mn_" + k] || 0) >= 1).length; // how many types cleared ≥1× (repeats don't count)
  return missions.KINDS.map((kind) => { // build one node per location
    const cleared = sc["mn_" + kind] || 0; // times this type was cleared
    const stars = cleared >= 5 ? 3 : cleared >= 3 ? 2 : cleared >= 1 ? 1 : 0; // 1–3 stars by clear count
    return { kind, cleared, stars, locked: kind === "Boss" && distinctCleared < needed }; // Boss locked until all types cleared
  });
}

// GET /api/game/profile — assemble the entire HQ state in one response (consumed by the HUD + HQ page).
async function profile(req, res) {
  await Game.ensureProfile(req.user.id);
  const p = await Game.getProfile(req.user.id);
  const info = gamify.levelInfo(p.xp); // level/rank/progress from XP
  const counts = await Game.countByAction(req.user.id);
  const badgeRows = await Game.getBadges(req.user.id);
  const earned = new Set(badgeRows.map((b) => b.badge_key)); // a Set for fast "have I earned this?" checks
  const badges = gamify.BADGES.map((b) => ({ // full list + an earned flag
    key: b.key, name: b.name, icon: b.icon, desc: b.desc, earned: earned.has(b.key),
  }));
  const rank = await Game.userRank(req.user.id);
  const challenge = todaysChallenge();
  const chReq = CHALLENGE_REQ[challenge.key]; // today's requirement
  const chClaimed = await Game.hasEventToday(req.user.id, "daily_challenge"); // claimed yet?
  const chHave = chClaimed ? chReq.n : await Game.countActionToday(req.user.id, chReq.action); // progress
  const energy = await readEnergy(req.user.id);
  const sc = await Game.scoreCounts(req.user.id); // mission clears per type
  const avatarImg = (shop.byKey(p.avatar) || {}).img || "/img/avatars/recruit.png"; // image for the equipped avatar
  return res.json({
    username: req.user.username,
    xp: p.xp, coins: p.coins, level: info.level, rank: info.rank,
    intoLevel: info.intoLevel, span: info.span, toNext: info.toNext, // XP-bar numbers
    streak: p.current_streak, longestStreak: p.longest_streak,
    energy: energy.energy, energyMax: energy.max, energyNextSec: energy.nextSec,
    avatar: p.avatar, avatarImg,
    leaderboardRank: rank,
    badges,
    quest: questSteps(counts, p),
    challenge: { ...challenge, done: chClaimed, have: Math.min(chHave, chReq.n), need: chReq.n, met: chHave >= chReq.n }, // done/progress/met
    missions: missionsProgress(sc),
    stats: counts,
  });
}

// GET /api/game/leaderboard?type=score|streak — the top players.
async function leaderboard(req, res) {
  const type = req.query.type === "streak" ? "streak" : "score"; // read the ?type= query, default "score"
  const rows = await Game.leaderboard(type, 20); // top 20
  const me = req.user ? req.user.id : null; // so we can flag "you" in the list
  return res.json({
    type,
    leaders: rows.map((r, i) => ({ // shape each row; i = the array index (0-based)
      position: i + 1, // 1-based rank
      username: r.username, xp: r.xp, level: r.level, streak: r.current_streak,
      isMe: r.user_id === me, // true for the logged-in player's row
    })),
  });
}

// Tracks the mission each user is currently on (in memory). A mission must be STARTED (which costs energy)
// before it can be CHECKED — this stops players from replaying /mission/check to farm XP for free.
const activeMission = new Map(); // key = userId, value = the mission id they started

// POST /api/game/mission/start { kind } — spend 1 energy and return a mission of that kind.
async function missionStart(req, res) {
  const kind = (req.body && req.body.kind) || null; // Email/SMS/… or null for any
  if (kind === "Boss") { // enforce the Boss lock on the SERVER (the map also disables the button, but that's not enough)
    const sc = await Game.scoreCounts(req.user.id);
    const boss = missionsProgress(sc).find((n) => n.kind === "Boss"); // is the Boss unlocked?
    if (boss && boss.locked) {
      return res.status(403).json({ locked: true, error: "Clear every case type once to unlock the Boss." }); // 403 = Forbidden
    }
  }
  const spent = await spendEnergy(req.user.id); // costs 1 energy
  if (!spent.ok) {
    return res.status(403).json({ noEnergy: true, energy: 0, energyMax: spent.max, energyNextSec: spent.nextSec }); // out of energy
  }
  const m = kind ? missions.randomByKind(kind) : missions.randomMission(); // pick a mission
  activeMission.set(req.user.id, m.id); // remember it (anti-cheat)
  return res.json({
    mission: missions.publicMission(m), // sends the message WITHOUT the answer
    energy: spent.energy, energyMax: spent.max, energyNextSec: spent.nextSec,
  });
}

// POST /api/game/mission/check { missionId, answer } — grade the answer.
async function missionCheck(req, res) {
  const { missionId, answer } = req.body || {};
  const m = missions.byId(missionId); // find the mission by id
  if (!m) return res.status(400).json({ error: "Unknown mission." });
  if (!req.user || activeMission.get(req.user.id) !== missionId) { // must be the mission they actually started
    return res.status(400).json({ error: "Start the mission before checking it." }); // blocks /check replay farming
  }
  activeMission.delete(req.user.id); // consume it — one check per energy-costed start
  const correct = String(answer).toLowerCase() === m.answer; // compare (lowercased) to the real answer

  const reward = await gamify.award(req.user.id, correct ? "mission_correct" : "mission_wrong"); // XP (more if correct)
  if (correct) await Game.recordScore(req.user.id, "mn_" + m.kind, 1); // record the clear for the map
  return res.json({ correct, answer: m.answer, why: m.why, reward }); // reveal the answer + explanation NOW (after submitting)
}

// POST /api/game/roast { text } — the Dojo: AI roasts a pasted scam.
async function roast(req, res) {
  const { text } = req.body || {};
  if (!text || text.trim().length < MIN) return res.status(400).json({ error: `Paste at least ${MIN} characters.` });
  if (text.length > MAX) return res.status(400).json({ error: `Max ${MAX} characters.` });

  let result;
  try {
    result = await roastScam(text); // AI roast + a 1–10 score
  } catch (e) {
    console.error("roast failed:", e.message);
    return res.status(502).json({ error: "The roaster is warming up — try again." });
  }
  let reward = null;
  if (req.user) reward = await gamify.award(req.user.id, "roast"); // XP for roasting
  return res.json({ ...result, reward });
}

// POST /api/game/challenge/complete — claim today's daily-challenge reward. Only pays out if it's actually done.
async function completeChallenge(req, res) {
  if (await Game.hasEventToday(req.user.id, "daily_challenge")) { // already claimed today?
    return res.json({ alreadyDone: true });
  }
  const ch = todaysChallenge();
  const need = CHALLENGE_REQ[ch.key]; // the requirement (action + count)
  const have = await Game.countActionToday(req.user.id, need.action); // how much they've done today
  if (have < need.n) { // not enough → refuse to pay (this is the anti-cheat that stops "claim without doing it")
    return res.status(400).json({ notYet: true, have, need: need.n, error: `Not done yet — ${have}/${need.n}.` });
  }
  const reward = await gamify.award(req.user.id, "daily_challenge"); // pay it
  return res.json({ reward });
}

// POST /api/game/poke — coins for poking Inspector Hoot, capped at 10 coins per day.
const POKE_DAILY_CAP = 10; // max coins from poking per day
const POKE_PER_HIT = 2; // coins per poke
async function pokeReward(req, res) {
  await Game.ensureProfile(req.user.id);
  const awardedToday = await Game.coinsFromActionToday(req.user.id, "owl_poke"); // coins poked so far today
  const remainingBefore = Math.max(0, POKE_DAILY_CAP - awardedToday); // how much is left under the cap (never negative)
  if (remainingBefore <= 0) { // cap reached
    const p = await Game.getProfile(req.user.id);
    return res.json({ awarded: 0, limit: true, remaining: 0, coins: p ? p.coins : 0, cap: POKE_DAILY_CAP });
  }
  const award = Math.min(POKE_PER_HIT, remainingBefore); // give 2, unless only 1 is left under the cap
  await Game.addXp(req.user.id, 0, award); // coins only (0 XP)
  await Game.logEvent(req.user.id, "owl_poke", 0, award); // log it so tomorrow's cap resets correctly
  const p = await Game.getProfile(req.user.id);
  const remaining = remainingBefore - award;
  return res.json({ awarded: award, limit: remaining <= 0, remaining, coins: p.coins, cap: POKE_DAILY_CAP });
}

// GET /api/game/shop — the catalogue + the user's balance + what they own/equipped.
async function getShop(req, res) {
  const p = await Game.getProfile(req.user.id);
  const owned = new Set(await Game.getPurchases(req.user.id)); // a Set of owned item keys
  owned.add("recruit"); // recruit is free/owned by default
  return res.json({
    coins: p ? p.coins : 0,
    equipped: p ? p.avatar : "recruit",
    items: shop.ITEMS.map((i) => ({ key: i.key, name: i.name, price: i.price, img: i.img, desc: i.desc, owned: owned.has(i.key) })), // catalogue + owned flag
  });
}

// POST /api/game/shop/buy { key } — buy an avatar.
async function buyItem(req, res) {
  const item = shop.byKey((req.body || {}).key); // look up the item
  if (!item) return res.status(400).json({ error: "Unknown item." });
  const owned = new Set(await Game.getPurchases(req.user.id));
  owned.add("recruit");
  if (owned.has(item.key)) return res.json({ alreadyOwned: true }); // no double-buying
  if (item.price > 0) {
    const ok = await Game.spendCoins(req.user.id, item.price); // atomic spend (false if too poor)
    if (!ok) return res.status(400).json({ error: "Not enough gold." });
  }
  await Game.addPurchase(req.user.id, item.key); // record ownership
  const p = await Game.getProfile(req.user.id);
  return res.json({ bought: true, coins: p.coins, key: item.key });
}

// POST /api/game/shop/equip { key } — equip an avatar you own.
async function equipItem(req, res) {
  const item = shop.byKey((req.body || {}).key);
  if (!item) return res.status(400).json({ error: "Unknown item." });
  const owned = new Set(await Game.getPurchases(req.user.id));
  owned.add("recruit");
  if (!owned.has(item.key)) return res.status(400).json({ error: "You don't own that yet." }); // must own it first
  await Game.setAvatar(req.user.id, item.key); // set as current avatar
  return res.json({ equipped: item.key, img: item.img });
}

// POST /api/game/story/complete — one-time XP for finishing the origin story.
async function storyComplete(req, res) {
  if (!req.user) return res.json({ guest: true }); // guests get no XP (they're prompted to sign up instead)
  const counts = await Game.countByAction(req.user.id);
  if (counts.story_win) return res.json({ already: true }); // only rewarded once ever
  const reward = await gamify.award(req.user.id, "story_win"); // pay the one-time reward
  return res.json({ reward });
}

module.exports = { // used by src/routes/game.routes.js
  profile, leaderboard, missionStart, missionCheck, roast, completeChallenge, storyComplete,
  getShop, buyItem, equipItem, pokeReward,
};
// <Shania End>
