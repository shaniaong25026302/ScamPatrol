// <Shania Start>
// src/server.js — Scam Patrol single Express app.
// Serves the JSON API (/api/*) AND renders the EJS pages (res.render) into views/layout.ejs.
// This is the M1-owned skeleton: teammates mount their routes + views at the marked points below.
// [DevOps: Config & secrets management] all configuration comes from environment variables (.env),
// which is gitignored so credentials are never committed to source control.
require("dotenv").config();

// Prefer IPv4 for ALL outbound DNS. Render has no outbound IPv6 route, so resolving
// smtp.gmail.com to an IPv6 address caused ENETUNREACH / SMTP connection timeouts.
require("dns").setDefaultResultOrder("ipv4first");

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const expressLayouts = require("express-ejs-layouts");

const { ping } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Render's proxy: trust X-Forwarded-* so req.protocol=https and req.get('host')
// resolve correctly (this makes the password-reset link build the real public URL).
app.set("trust proxy", 1);

// ── View engine: EJS + a single shared layout (views/layout.ejs) ──
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(expressLayouts);
app.set("layout", "layout");

// ── Core middleware ──
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// attachUser: sets req.user + res.locals.user when a valid token is present; never blocks.
const { attachUser } = require("./middleware/auth.middleware");
app.use(attachUser);

// App-wide gamification: passively award XP for successful actions (incl. teammates' routes).
app.use(require("./middleware/gamification.middleware").gamificationObserver);

// Default locals so partials (navbar) always have something to read.
app.use((req, res, next) => {
  if (typeof res.locals.user === "undefined") res.locals.user = null;
  res.locals.activePage = "";
  next();
});

// Guests can ONLY see the gamified homepage + auth. Everything else requires login.
// (Implemented here so teammates' routes are gated without editing their files.)
app.use((req, res, next) => {
  if (req.user) return next();
  const p = req.path;
  const open =
    p === "/" ||
    p.startsWith("/auth") ||
    p.startsWith("/api/auth") ||
    p === "/api/health" ||
    p.startsWith("/api/game/story");
  // Scam Weather is intentionally NOT in this guest allow-list.
  // Result: guests see only Story/Login/Signup, while logged-in users see Scam Weather in the navbar.
  if (open) return next();
  if (p.startsWith("/api/")) return res.status(401).json({ error: "Login required." });
  return res.redirect("/");
});

// [DevOps: Monitoring / health check] a liveness+readiness endpoint that also probes the DB,
// so uptime monitors (and Render) can detect when the service or database is unhealthy.
app.get("/api/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "ok", db: "up" });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "down", error: err.code || err.message });
  }
});

// ── Pages ──
// Homepage IS the game now — the origin story (renders in the retro game layout).
app.get("/", (req, res) => {
  res.render("game/story", {
    title: "Scam Patrol HQ — Second Chance",
    activePage: "story",
  });
});

// ─────────────────────────────────────────────────────────────────
//  MOUNT POINTS — teammates add their routers + views here.
//  Keep API routers under /api/*, page routers under their path.
// ─────────────────────────────────────────────────────────────────
// M1 (me) — Auth + AI Checker (live):
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/auth", require("./routes/auth.pages.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
app.use("/ai-checker", require("./routes/ai.pages.routes"));
// Scam Patrol HQ — gamification API + game pages (Leaderboard taken over from M5):
app.use("/api/game", require("./routes/game.routes"));
app.use("/", require("./routes/game.pages.routes"));
// <Rebecca Member 2 Start>
// M2 Rebecca — scam case CRUD + image upload + categories API
app.use("/api/cases", require("./routes/cases.api.routes"));
app.use("/api/categories", require("./routes/categories.routes"));
// <Rebecca Member 2 End>
// M3 Nivi — case browse/vote/flag + shared case pages
app.use("/cases", require("./routes/cases.pages.routes"));
// M4 CG — comments + profile
// M5 Liam — Scam Weather (seasonal scam forecast + admin posts)
// API first: browser JavaScript uses these endpoints for daily-report automation.
app.use("/api/scam-weather", require("./routes/scamweather.api.routes"));
app.use("/scam-weather", require("./routes/scamweather.pages.routes"));
// M6 Shawn — landing/glossary/admin
// Shawn Start
// Chat History (Shawn)
app.use("/api/chat", require("./routes/chat-hist.routes")); // Shawn
app.use("/admin", require("./routes/admin.pages.routes")); //Shawn
app.use("/glossary", require("./routes/glossary.pages.routes")); // added by M6 (Shawn)
// Shawn End

// <Shania End>
// <Shania Start>

// ── 404 (HTML page vs JSON API) ──
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).render("index", { title: "Not found · Scam Patrol", activePage: "" });
});

// [DevOps: Centralized error handling / resilience] one place catches every unhandled error so
// a fault in any route returns a clean 500 instead of crashing the whole process.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith("/api/")) {
    return res.status(500).json({ error: "Internal server error" });
  }
  res.status(500).send("Internal server error");
});

// Only listen when started directly (node src/server.js). When required by tests,
// the app is exported un-started so they can listen on an ephemeral port.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Scam Patrol running on http://localhost:${PORT}`);
    // Warm the SMTP pool so the first password-reset email skips the handshake.
    require("./services/mail.service").warmUp().catch(() => {});
  });

  // [DevOps: Graceful shutdown] on a termination signal, stop accepting requests and close the
  // DB pool before exiting, so no connection is left dangling (matters on the 5-connection cap).
  const shutdown = (sig) => {
    console.log(`${sig} received — shutting down gracefully`);
    server.close(() => require("./db").pool.end().finally(() => process.exit(0)));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;
// <Shania End>
