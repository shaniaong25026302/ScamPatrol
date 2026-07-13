// <Liam Member 5 Start>
// src/routes/scamweather.pages.routes.js — Scam Weather pages, mounted at /scam-weather.
//
// This router handles the human-facing EJS screens only. Automated JSON endpoints
// live in src/routes/scamweather.api.routes.js so teammates can clearly see:
// - page routes = browser screens
// - API routes  = data for JavaScript / automation
const express = require("express");
const router = express.Router();

const { requireAuthPage } = require("../middleware/auth.middleware");
const scamWeatherService = require("../services/scamweather.service");

// The service expects a user shaped as { id, username, isAdmin }. The main app
// stores req.user as { id, username, role }, so this adapter keeps Liam's
// feature independent from Shania's auth implementation details.
function currentUserOf(req) {
  if (!req.user) return null;
  return {
    id: req.user.id,
    username: req.user.username,
    isAdmin: req.user.role === "admin"
  };
}

// Page-style admin guard:
// - guests go to login
// - logged-in non-admin users get a friendly forbidden page
function requireAdminPage(req, res, next) {
  if (!req.user) return res.redirect(`/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
  if (req.user.role !== "admin") {
    return res.status(403).render("scam-weather/forbidden", {
      title: "Admins only · Scam Patrol",
      activePage: "scam-weather",
    });
  }
  next();
}

// GET /scam-weather
// Public page. It renders quickly from cached/seed articles, then starts a
// background refresh. The daily report itself is loaded by JavaScript so users
// can scroll to Scam News while the report is being prepared.
router.get("/", (req, res, next) => {
  try {
    const currentUser = currentUserOf(req);
    const selectedScamType = req.query.type || "all";
    const selectedSource = req.query.source || "all";
    const pageData = scamWeatherService.getScamWeatherPageData({
      selectedScamType,
      selectedSource
    });

    // Non-blocking refresh: if live feeds are slow, the page still loads.
    scamWeatherService.startBackgroundRefresh();

    const editorialPosts = pageData.editorialPosts.map((post) => ({
      ...post,
      canEdit: scamWeatherService.canEditPost(currentUser, post),
    }));

    res.render("scam-weather/index", {
      title: "Scam Weather · Scam Patrol",
      activePage: "scam-weather",
      currentUser,
      forecast: pageData.forecast,
      news: pageData.news,
      editorialPosts,
      trustedSources: pageData.trustedSources,
      scamTypes: pageData.scamTypes,
      selectedScamType: pageData.selectedScamType,
      selectedSource: pageData.selectedSource,
    });
  } catch (err) {
    next(err);
  }
});

// GET /scam-weather/new
// Admin-only manual post form. This is separate from automated Scam News;
// it lets admins publish announcements/advice when needed.
router.get("/new", requireAdminPage, (req, res) => {
  res.render("scam-weather/form", {
    title: "New Scam Weather Post · Scam Patrol",
    activePage: "scam-weather",
    mode: "create",
    post: null,
    error: "",
  });
});

// POST /scam-weather
// Admin-only manual post creation.
router.post("/", requireAdminPage, (req, res) => {
  const result = scamWeatherService.createPost(currentUserOf(req), req.body);
  if (!result.success) {
    return res.status(400).render("scam-weather/form", {
      title: "New Scam Weather Post · Scam Patrol",
      activePage: "scam-weather",
      mode: "create",
      post: req.body,
      error: result.message,
    });
  }
  res.redirect("/scam-weather");
});

// GET /scam-weather/:id/edit
// Edit form. Admins can edit all posts; the author check is also supported so
// this feature remains future-proof for trusted contributors.
router.get("/:id/edit", requireAuthPage, (req, res) => {
  const post = scamWeatherService.getPostById(req.params.id);
  if (!post) {
    return res.status(404).render("scam-weather/forbidden", {
      title: "Post not found · Scam Patrol",
      activePage: "scam-weather",
    });
  }
  if (!scamWeatherService.canEditPost(currentUserOf(req), post)) {
    return res.status(403).render("scam-weather/forbidden", {
      title: "Not your post · Scam Patrol",
      activePage: "scam-weather",
    });
  }
  res.render("scam-weather/form", {
    title: "Edit Scam Weather Post · Scam Patrol",
    activePage: "scam-weather",
    mode: "edit",
    post,
    error: "",
  });
});

// POST /scam-weather/:id/edit
router.post("/:id/edit", requireAuthPage, (req, res) => {
  const result = scamWeatherService.updatePost(currentUserOf(req), req.params.id, req.body);
  if (!result.success) {
    return res.status(400).render("scam-weather/form", {
      title: "Edit Scam Weather Post · Scam Patrol",
      activePage: "scam-weather",
      mode: "edit",
      post: { id: req.params.id, ...req.body },
      error: result.message,
    });
  }
  res.redirect("/scam-weather");
});

// POST /scam-weather/:id/delete
router.post("/:id/delete", requireAuthPage, (req, res) => {
  scamWeatherService.deletePost(currentUserOf(req), req.params.id);
  res.redirect("/scam-weather");
});

module.exports = router;
// <Liam Member 5 End>
