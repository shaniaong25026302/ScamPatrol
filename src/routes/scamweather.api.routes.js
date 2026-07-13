// <Liam Member 5 Start>
// src/routes/scamweather.api.routes.js — JSON endpoints for Scam Weather.
//
// These endpoints support the "automation" portion of the feature:
// - /daily-report lets the page fetch report diagrams asynchronously.
// - /monthly-report gives a wider current-month/30-day signal when daily news is quiet.
// - /news returns 6 articles at a time for the "View more" button.
// - /refresh can be called by admins before a demo to refresh source feeds.
// - /sources exposes the reputable source allow-list for transparency.
const express = require("express");
const router = express.Router();

const scamWeatherService = require("../services/scamweather.service");

function requireAdminApi(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Login required." });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only." });
  next();
}

// GET /api/scam-weather/daily-report
// Refreshes article feeds if the cache is stale, then returns a chart-ready
// Daily Report. The browser shows a loading animation while this runs.
router.get("/daily-report", async (req, res, next) => {
  try {
    await scamWeatherService.refreshArticles({ force: req.query.force === "1" });
    return res.json({
      ok: true,
      report: scamWeatherService.buildDailyReport()
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/scam-weather/monthly-report
// Monthly Reports should not depend on the last 24 hours. This endpoint uses
// the current month first, then falls back to 30/90-day trusted-source windows
// and seasonal advice if the live news pool is quiet.
router.get("/monthly-report", async (req, res, next) => {
  try {
    await scamWeatherService.refreshArticles({ force: req.query.force === "1" });
    return res.json({
      ok: true,
      report: scamWeatherService.buildMonthlyReport()
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/scam-weather/news?page=1&limit=6&type=Phishing&source=BleepingComputer
// Returns paginated scam/cybersecurity articles. The first page is rendered by
// EJS; this endpoint powers the "View another 6 articles" button.
router.get("/news", (req, res) => {
  const data = scamWeatherService.getArticlesFromCache({
    page: req.query.page || 1,
    limit: req.query.limit || 6,
    scamType: req.query.type || "all",
    source: req.query.source || "all"
  });

  return res.json({ ok: true, ...data });
});

// POST /api/scam-weather/refresh
// Admin-only manual refresh. Useful before presenting the project.
router.post("/refresh", requireAdminApi, async (req, res, next) => {
  try {
    const cache = await scamWeatherService.refreshArticles({ force: true });
    return res.json({
      ok: true,
      message: "Scam Weather source refresh completed.",
      fetchedAt: cache.lastFetchedAt,
      mode: cache.mode,
      sourceRuns: cache.sourceRuns
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/scam-weather/sources
// Transparency endpoint: shows the exact reputable source list used.
router.get("/sources", (req, res) => {
  return res.json({
    ok: true,
    sources: scamWeatherService.TRUSTED_SOURCES
  });
});

module.exports = router;
// <Liam Member 5 End>
