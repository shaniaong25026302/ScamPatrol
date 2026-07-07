// <Shania Start>
// src/services/gamification.service.js — the XP/level/streak/badge/energy engine.
// award() is the single entry point that adds XP + coins, updates the streak, recomputes level, and grants badges.
// Called by ai.controller.js, game.controller.js, and gamification.middleware.js.
const Game = require("../models/game.model"); // all the DB reads/writes it needs — src/models/game.model.js

// action name → its reward. This one table tunes the whole economy. Used by award() below and by the HUD toasts.
const XP_RULES = {
  ai_check: { xp: 10, coins: 5, label: "Analyzed a message" },
  high_risk_caught: { xp: 15, coins: 10, label: "Caught a high-risk scam" },
  relationship_check: { xp: 20, coins: 12, label: "Mapped a long-con" },
  mission_correct: { xp: 15, coins: 20, label: "Mission cleared" },
  mission_wrong: { xp: 2, coins: 0, label: "Nice try" }, // small XP even when wrong, so trying isn't punished
  roast: { xp: 8, coins: 5, label: "Roasted a scam" },
  daily_challenge: { xp: 50, coins: 30, label: "Daily challenge done" },
  case_report: { xp: 25, coins: 20, label: "Reported a scam" }, // awarded to teammates' actions via gamification.middleware.js
  case_vote: { xp: 3, coins: 1, label: "Voted on a case" },
  case_flag: { xp: 4, coins: 2, label: "Flagged a case" },
  comment: { xp: 5, coins: 2, label: "Left a comment" },
  story_win: { xp: 50, coins: 40, label: "Saved Uncle Ong" },
};

// Level thresholds → rank name. "from" is the level at which that rank starts.
const RANKS = [
  { from: 1, name: "Recruit" },
  { from: 5, name: "Detective" },
  { from: 10, name: "Chief" },
  { from: 20, name: "Legend" },
];

// Given a level, return the highest rank name it has reached.
function rankName(level) {
  let name = RANKS[0].name; // start at "Recruit"
  for (const r of RANKS) if (level >= r.from) name = r.name; // step up while the level meets each threshold
  return name;
}

// Convert total XP into level info. Triangular curve: level L needs more XP than the last (100, then 200, then 300…).
function levelInfo(totalXp) {
  let level = 1; // everyone starts at level 1
  let acc = 0; // total XP "used up" by levels already completed
  let need = 100; // XP required for the NEXT level (grows each loop)
  while (totalXp >= acc + need) { // while we still have enough XP to level up…
    acc += need; // …consume this level's XP…
    level += 1; // …go up a level…
    need = 100 * level; // …and the next level costs 100 × the new level
  }
  return {
    level, // current level
    rank: rankName(level), // matching rank name
    intoLevel: totalXp - acc, // XP earned inside the current level (for the progress bar)
    span: need, // total XP the current level needs
    toNext: acc + need - totalXp, // XP still needed to reach the next level
    totalXp,
  };
}

// Badge definitions. Each check(s) is a function returning true when earned. s = { counts, profile }.
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

// Format a Date as YYYY-MM-DD using LOCAL time (avoids a UTC off-by-one-day bug when comparing to MySQL DATEs).
function fmtLocal(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0"); // getMonth() is 0-based, so +1; padStart(2,"0") makes "3" → "03"
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // e.g. "2026-07-07"
}

// Today's local date as a YYYY-MM-DD string.
function todayStr() {
  return fmtLocal(new Date());
}

// Work out the new streak from the profile's last active date. Returns { current, longest, today, changed }.
function nextStreak(profile) {
  const today = todayStr();
  const last = profile.last_active_date ? fmtLocal(profile.last_active_date) : null; // the last day they were active
  if (last === today) { // already active today → nothing changes
    return { current: profile.current_streak, longest: profile.longest_streak, today, changed: false };
  }
  const yesterday = fmtLocal(new Date(Date.now() - 86400000)); // 86400000 ms = 1 day; so this is yesterday's date
  const current = last === yesterday ? profile.current_streak + 1 : 1; // consecutive day → +1, otherwise reset to 1
  const longest = Math.max(current, profile.longest_streak || 0); // keep the best-ever streak
  return { current, longest, today, changed: true };
}

// After an award, grant any newly-qualified badges. Returns only the NEW ones (so the HUD can toast them).
async function checkBadges(userId, profile) {
  const counts = await Game.countByAction(userId); // fresh per-action counts from the DB
  const stats = { counts, profile }; // the object each badge's check() reads
  const newly = [];
  for (const b of BADGES) {
    if (b.check(stats)) { // do they now qualify for this badge?
      const granted = await Game.addBadge(userId, b.key); // insert it (returns false if already earned)
      if (granted) newly.push({ key: b.key, name: b.name, icon: b.icon, desc: b.desc }); // collect only brand-new grants
    }
  }
  return newly;
}

// THE CORE FUNCTION. Award XP/coins for an action, update streak + level + badges. Returns a summary for the HUD,
// or null for guests / unknown actions. Wrapped in try/catch so a gamification error can NEVER break the real action.
async function award(userId, action) {
  if (!userId) return null; // no logged-in user → nothing to award
  const rule = XP_RULES[action]; // look up the reward for this action
  if (!rule) return null; // action isn't in the table → ignore
  try {
    await Game.ensureProfile(userId); // make sure a profile row exists
    let profile = await Game.getProfile(userId); // load the current profile

    const streak = nextStreak(profile); // recompute the streak
    if (streak.changed) await Game.setStreak(userId, streak.current, streak.longest, streak.today); // save it if it changed

    await Game.addXp(userId, rule.xp, rule.coins); // add the XP + coins
    await Game.logEvent(userId, action, rule.xp, rule.coins); // log this award (ledger row)

    profile = await Game.getProfile(userId); // reload to get the new XP total
    const info = levelInfo(profile.xp); // recompute level from the new XP
    const leveledUp = info.level !== profile.level; // did the level number change?
    if (leveledUp) await Game.setLevel(userId, info.level); // persist the new level
    profile.level = info.level;

    const newBadges = await checkBadges(userId, profile); // grant any new badges

    return { // the summary the HUD uses to show toasts (see public/js/game-hud.js showReward)
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
    console.error("gamification.award failed:", e.message); // swallow the error so the underlying action still succeeds
    return null;
  }
}

// ---- Energy: 5 max, regenerates 1 per hour ----
const MAX_ENERGY = 5; // the cap
const ENERGY_MS = 60 * 60 * 1000; // 1 hour in ms (60min × 60s × 1000ms) — one energy point regenerates per hour

// Compute current energy from the stored value + time elapsed. Because it's time-based, energy keeps
// regenerating even while the server is off — no timers needed. Called by game.controller.js readEnergy.
function computeEnergy(profile) {
  let energy = profile.energy == null ? MAX_ENERGY : profile.energy; // default to full if never set
  let updated = profile.energy_updated_at ? new Date(profile.energy_updated_at).getTime() : Date.now(); // ms of last update
  let changed = false;
  if (energy < MAX_ENERGY) { // only regenerate if not already full
    const now = Date.now();
    const gained = Math.floor((now - updated) / ENERGY_MS); // whole hours passed = energy points earned
    if (gained > 0) {
      energy = Math.min(MAX_ENERGY, energy + gained); // add them, but never exceed the cap
      updated = energy >= MAX_ENERGY ? now : updated + gained * ENERGY_MS; // advance the "last updated" clock
      changed = true; // tell the caller to save this
    }
  }
  const nextSec = energy >= MAX_ENERGY ? 0 : Math.ceil((ENERGY_MS - (Date.now() - updated)) / 1000); // seconds until the next point (0 if full)
  return { energy, max: MAX_ENERGY, updatedAt: new Date(updated), nextSec, changed };
}

module.exports = { // exported for the controllers + middleware
  award, levelInfo, rankName, XP_RULES, BADGES, RANKS, checkBadges, todayStr,
  computeEnergy, MAX_ENERGY,
};
// <Shania End>
