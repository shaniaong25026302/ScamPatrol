// <Shania Start>
// src/middleware/gamification.middleware.js — passive, app-wide XP.
// Watches finished responses and awards XP for successful actions ANYWHERE in the app
// (including teammates' routes) without modifying their controllers. Mount after attachUser.
const gamify = require("../services/gamification.service");

// Map a finished request to an XP action, or null. Only fires on success statuses.
function actionFor(req, status) {
  if (status < 200 || status >= 300) return null;
  const m = req.method;
  const p = req.path;

  // Member 2/3 — report a scam case (POST /api/cases)
  if (m === "POST" && /^\/api\/cases\/?$/.test(p)) return "case_report";
  // Community votes / flags (any path containing /vote or /flag)
  if (m === "POST" && /\/vote(\/|$)/.test(p)) return "case_vote";
  if (m === "POST" && /\/flag(\/|$)/.test(p)) return "case_flag";
  // Member 4 — comments (any POST to a /comment(s) path)
  if (m === "POST" && /\/comments?(\/|$)/.test(p)) return "comment";

  return null;
}

function gamificationObserver(req, res, next) {
  res.on("finish", () => {
    try {
      if (!req.user) return;
      const action = actionFor(req, res.statusCode);
      if (action) gamify.award(req.user.id, action); // fire-and-forget
    } catch (_) {
      /* never let gamification break a request */
    }
  });
  next();
}

module.exports = { gamificationObserver, actionFor };
// <Shania End>
