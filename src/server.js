// <Shania Start>
// src/server.js — scamlah single Express app.
// Serves the JSON API (/api/*) AND renders the EJS pages (res.render) into views/layout.ejs.
// This is the M1-owned skeleton: teammates mount their routes + views at the marked points below.
require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const expressLayouts = require("express-ejs-layouts");

const { ping } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(require("./middleware/auth.middleware").attachUser);

// Default locals so partials (navbar) always have something to read.
app.use((req, res, next) => {
  if (typeof res.locals.user === "undefined") res.locals.user = null;
  res.locals.activePage = "";
  next();
});

// ── Health check ──
app.get("/api/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "ok", db: "up" });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "down", error: err.code || err.message });
  }
});

// ── Pages ──
app.get("/", (req, res) => {
  res.render("index", { title: "scamlah", activePage: "home" });
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
// <Rebecca Member 2 Start>
// M2 Rebecca — scam case CRUD + image upload + categories API
app.use("/api/cases", require("./routes/cases.api.routes"));
app.use("/api/categories", require("./routes/categories.routes"));
// <Rebecca Member 2 End>
// M3 Nivi — case browse/vote/flag + shared case pages
app.use("/cases", require("./routes/cases.pages.routes"));
// M4 CG — comments + profile
// M5 Liam — points/leaderboard
// M6 Shawn — landing/glossary/admin
// <Shania End>
app.use("/glossary", require("./routes/glossary.pages.routes")); // added by M6 (Shawn)
// <Shania Start>

// ── 404 (HTML page vs JSON API) ──
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).render("index", { title: "Not found · scamlah", activePage: "" });
});

// ── Error handler ──
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
  app.listen(PORT, () => console.log(`scamlah running on http://localhost:${PORT}`));
}

module.exports = app;
// <Shania End>
