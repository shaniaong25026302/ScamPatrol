// <Shania Start>
// src/middleware/gamification.middleware.js — passive, app-wide XP.
// Watches finished responses and awards XP for successful actions ANYWHERE in the app
// (including teammates' routes) without modifying their controllers. Mount after attachUser.
const gamify = require("../services/gamification.service");

// Map a finished request to an XP action, or null. Fires on success (2xx) or redirect (3xx) statuses.
function actionFor(req, status) {
  if (status < 200 || status >= 400) return null;
  const m = req.method;
  // Use the FULL path: on "finish", req.path is mount-relative (POST /cases shows as "/"); req.originalUrl isn't.
  const p = (req.originalUrl || req.url || "").split("?")[0];

  // Member 2/3 — report a scam case (page form POST /cases, API POST /api/cases, or draft submit)
  if (m === "POST" && (/^\/(api\/)?cases\/?$/.test(p) || /^\/cases\/drafts\/\d+\/submit\/?$/.test(p))) return "case_report";
  // Community votes / flags (any path containing /vote or /flag)
  if (m === "POST" && /\/vote(\/|$)/.test(p)) return "case_vote";
  if (m === "POST" && /\/flag(\/|$)/.test(p)) return "case_flag";
  // Member 4 — creating a comment (POST to a path ENDING in /comment(s); NOT edit/delete)
  if (m === "POST" && /\/comments?\/?$/.test(p)) return "comment";

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
