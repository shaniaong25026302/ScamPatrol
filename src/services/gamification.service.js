// <Shania Start>
// src/services/gamification.service.js — XP/level/streak/badge engine for "Scam Patrol HQ".
// award() is the single entry point; it's safe to call fire-and-forget (errors are swallowed).
const Game = require("../models/game.model");

// action -> reward. Used app-wide (AI checks + teammate actions via the observer middleware).
const XP_RULES = {
  ai_check: { xp: 10, coins: 5, label: "Analyzed a message" },
  high_risk_caught: { xp: 15, coins: 10, label: "Caught a high-risk scam" },
  relationship_check: { xp: 20, coins: 12, label: "Mapped a long-con" },
  mission_correct: { xp: 15, coins: 20, label: "Mission cleared" },
  mission_wrong: { xp: 2, coins: 0, label: "Nice try" },
  roast: { xp: 8, coins: 5, label: "Roasted a scam" },
  daily_challenge: { xp: 50, coins: 30, label: "Daily challenge done" },
  case_report: { xp: 25, coins: 20, label: "Reported a scam" },
  case_vote: { xp: 3, coins: 1, label: "Voted on a case" },
  case_flag: { xp: 4, coins: 2, label: "Flagged a case" },
  comment: { xp: 5, coins: 2, label: "Left a comment" },
  story_win: { xp: 50, coins: 40, label: "Saved Uncle Ong" },
};

// Ranks shown on the HUD / rank-up panel.
const RANKS = [
  { from: 1, name: "Recruit" },
  { from: 5, name: "Detective" },
  { from: 10, name: "Chief" },
  { from: 20, name: "Legend" },
];

function rankName(level) {
  let name = RANKS[0].name;
  for (const r of RANKS) if (level >= r.from) name = r.name;
  return name;
}

// Triangular XP curve: reaching level L needs 100 * (L-1)L/2 total XP.
function levelInfo(totalXp) {
  let level = 1;
  let acc = 0;
  let need = 100;
  while (totalXp >= acc + need) {
    acc += need;
    level += 1;
    need = 100 * level;
  }
  return {
    level,
    rank: rankName(level),
    intoLevel: totalXp - acc,
    span: need,
    toNext: acc + need - totalXp,
    totalXp,
  };
}

// Badge definitions. check(stats) -> boolean. stats = { counts, profile }.
const BADGES = [
  { key: "first_catch", name: "First Catch", icon: "🎯", desc: "Run your first analysis", check: (s) => (s.counts.ai_check || 0) >= 1 },
  { key: "eagle_eye", name: "Eagle Eye", icon: "🦅", desc: "Catch 10 high-risk scams", check: (s) => (s.counts.high_risk_caught || 0) >= 10 },
  { key: "sharpshooter", name: "Sharpshooter", icon: "🎖️", desc: "Clear 10 missions", check: (s) => (s.counts.mission_correct || 0) >= 10 },
  { key: "roast_master", name: "Roast Master", icon: "🔥", desc: "Roast 5 scams", check: (s) => (s.counts.roast || 0) >= 5 },
  { key: "on_fire", name: "On Fire", icon: "🔥", desc: "Hit a 7-day streak", check: (s) => (s.profile.current_streak || 0) >= 7 },
  { key: "detective", name: "Detective", icon: "🕵️", desc: "Reach level 5", check: (s) => (s.profile.level || 1) >= 5 },
  { key: "chief", name: "Chief", icon: "⭐", desc: "Reach level 10", check: (s) => (s.profile.level || 1) >= 10 },
  { key: "guardian", name: "Community Guardian", icon: "🛡️", desc: "Report 5 scams", check: (s) => (s.counts.case_report || 0) >= 5 },
  { key: "second_chance", name: "Second Chance", icon: "⏳", desc: "Complete the origin story", check: (s) => (s.counts.story_win || 0) >= 1 },
];

// Format a date as YYYY-MM-DD using LOCAL components (avoids the UTC day-shift that
// toISOString() causes when comparing against a MySQL DATE read back as local midnight).
function fmtLocal(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return fmtLocal(new Date());
}

// Update the daily streak based on last_active_date. Returns the new streak object.
function nextStreak(profile) {
  const today = todayStr();
  const last = profile.last_active_date ? fmtLocal(profile.last_active_date) : null;
  if (last === today) {
    return { current: profile.current_streak, longest: profile.longest_streak, today, changed: false };
  }
  const yesterday = fmtLocal(new Date(Date.now() - 86400000));
  const current = last === yesterday ? profile.current_streak + 1 : 1;
  const longest = Math.max(current, profile.longest_streak || 0);
  return { current, longest, today, changed: true };
}

async function checkBadges(userId, profile) {
  const counts = await Game.countByAction(userId);
  const stats = { counts, profile };
  const newly = [];
  for (const b of BADGES) {
    if (b.check(stats)) {
      const granted = await Game.addBadge(userId, b.key);
      if (granted) newly.push({ key: b.key, name: b.name, icon: b.icon, desc: b.desc });
    }
  }
  return newly;
}

// Core: award XP/coins for an action, update streak + level + badges.
// Returns a summary used to drive HUD toasts, or null for guests/unknown actions.
async function award(userId, action) {
  if (!userId) return null;
  const rule = XP_RULES[action];
  if (!rule) return null;
  try {
    await Game.ensureProfile(userId);
    let profile = await Game.getProfile(userId);

    const streak = nextStreak(profile);
    if (streak.changed) await Game.setStreak(userId, streak.current, streak.longest, streak.today);

    await Game.addXp(userId, rule.xp, rule.coins);
    await Game.logEvent(userId, action, rule.xp, rule.coins);

    profile = await Game.getProfile(userId);
    const info = levelInfo(profile.xp);
    const leveledUp = info.level !== profile.level;
    if (leveledUp) await Game.setLevel(userId, info.level);
    profile.level = info.level;

    const newBadges = await checkBadges(userId, profile);

    return {
      action,
      label: rule.label,
      gainedXp: rule.xp,
      gainedCoins: rule.coins,
      level: info.level,
      rank: info.rank,
      leveledUp,
      streak: streak.current,
      newBadges,
    };
  } catch (e) {
    console.error("gamification.award failed:", e.message);
    return null;
  }
}

// ---- Energy: 5 max, regenerates 1 per hour ----
const MAX_ENERGY = 5;
const ENERGY_MS = 60 * 60 * 1000;

function computeEnergy(profile) {
  let energy = profile.energy == null ? MAX_ENERGY : profile.energy;
  let updated = profile.energy_updated_at ? new Date(profile.energy_updated_at).getTime() : Date.now();
  let changed = false;
  if (energy < MAX_ENERGY) {
    const now = Date.now();
    const gained = Math.floor((now - updated) / ENERGY_MS);
    if (gained > 0) {
      energy = Math.min(MAX_ENERGY, energy + gained);
      updated = energy >= MAX_ENERGY ? now : updated + gained * ENERGY_MS;
      changed = true;
    }
  }
  const nextSec = energy >= MAX_ENERGY ? 0 : Math.ceil((ENERGY_MS - (Date.now() - updated)) / 1000);
  return { energy, max: MAX_ENERGY, updatedAt: new Date(updated), nextSec, changed };
}

module.exports = {
  award, levelInfo, rankName, XP_RULES, BADGES, RANKS, checkBadges, todayStr,
  computeEnergy, MAX_ENERGY,
};
// <Shania End>
