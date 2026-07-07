// <Shania Start>
// src/middleware/gamification.middleware.js — passively awards XP for teammates' actions WITHOUT editing
// their code. Mounted globally in src/server.js, after attachUser so req.user is available.
const gamify = require("../services/gamification.service"); // gamify.award() is in src/services/gamification.service.js

// Look at a finished request and decide which XP action (if any) it earns. Returns an action name or null.
function actionFor(req, status) {
  if (status < 200 || status >= 300) return null; // only reward SUCCESS responses (HTTP 2xx); 4xx/5xx earn nothing
  const m = req.method; // the HTTP method, e.g. "POST"
  const p = req.path; // the URL path, e.g. "/api/cases"

  // Below: match a method + path pattern (regex) to an action. /pattern/.test(p) returns true if it matches.
  if (m === "POST" && /^\/api\/cases\/?$/.test(p)) return "case_report"; // creating a scam case (^…$ = whole path, \/? = optional trailing slash)
  if (m === "POST" && /\/vote(\/|$)/.test(p)) return "case_vote"; // any path containing /vote
  if (m === "POST" && /\/flag(\/|$)/.test(p)) return "case_flag"; // any path containing /flag
  if (m === "POST" && /\/comments?(\/|$)/.test(p)) return "comment"; // /comment or /comments (the s? = optional "s")

  return null; // this request doesn't earn XP
}

// The middleware itself. Registers a listener for when the response finishes, then awards XP.
function gamificationObserver(req, res, next) {
  res.on("finish", () => { // "finish" fires AFTER the response has been fully sent to the browser
    try {
      if (!req.user) return; // guests earn nothing
      const action = actionFor(req, res.statusCode); // does this finished request earn XP?
      if (action) gamify.award(req.user.id, action); // fire-and-forget: we DON'T await, so the reward never delays the response
    } catch (_) {
      /* never let gamification break a request */
    }
  });
  next(); // continue immediately — the reward happens later, after the response finishes
}

module.exports = { gamificationObserver, actionFor }; // observer is mounted in server.js; actionFor is exported for tests
// <Shania End>
