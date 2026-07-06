// <Liam Member 5 Start>
// src/routes/scamweather.pages.routes.js — Scam Weather pages, mounted at /scam-weather in src/server.js.
// Liam's scamWeatherService is reused as-is; this router just adapts it to the main app's auth
// (JWT cookie → req.user) and renders his views into the shared layout (views/layout.ejs).
const express = require("express");
const router = express.Router();
const { requireAuthPage } = require("../middleware/auth.middleware"); // page login guard (redirects guests)
const scamWeatherService = require("../services/scamweather.service"); // Liam's service (unchanged)

// The service expects a user shaped as { id, username, isAdmin }. The main app stores req.user as
// { id, username, role }, so map it here (isAdmin = role === "admin"). Returns null for guests.
function currentUserOf(req) {
  if (!req.user) return null;
  return { id: req.user.id, username: req.user.username, isAdmin: req.user.role === "admin" };
}

// Page-style admin guard: guests → login page; logged-in non-admins → the friendly "forbidden" page.
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

// Public forecast + posts. Everyone can view (logged in or not).
router.get("/", (req, res) => {
  const currentUser = currentUserOf(req);
  const selectedCategory = req.query.category || "all";
  const posts = scamWeatherService.getPosts(selectedCategory).map((post) => ({
    ...post,
    canEdit: scamWeatherService.canEditPost(currentUser, post),
  }));
  res.render("scam-weather/index", {
    title: "Scam Weather · Scam Patrol",
    activePage: "scam-weather",
    forecast: scamWeatherService.getForecast(),
    posts,
    selectedCategory,
    currentUser,
  });
});

// Admin-only: new-post form.
router.get("/new", requireAdminPage, (req, res) => {
  res.render("scam-weather/form", {
    title: "New Scam Weather Post · Scam Patrol",
    activePage: "scam-weather",
    mode: "create",
    post: null,
    error: "",
  });
});

// Admin-only: create a post.
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

// Edit form (login required; the service also checks admin/author ownership).
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

// Edit submit.
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

// Delete submit.
router.post("/:id/delete", requireAuthPage, (req, res) => {
  scamWeatherService.deletePost(currentUserOf(req), req.params.id);
  res.redirect("/scam-weather");
});

module.exports = router;
// <Liam Member 5 End>
