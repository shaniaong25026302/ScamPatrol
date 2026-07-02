const express = require("express");
const authService = require("../services/authService");
const scamWeatherService = require("../services/scamWeatherService");

const router = express.Router();

// Public Scam Weather page. Everyone can view this, logged in or not.
router.get("/", (req, res) => {
  const selectedCategory = req.query.category || "all";
  const posts = scamWeatherService.getPosts(selectedCategory).map((post) => ({
    ...post,
    canEdit: scamWeatherService.canEditPost(req.currentUser, post)
  }));

  res.render("scam-weather/index", {
    activePage: "scam-weather",
    forecast: scamWeatherService.getForecast(),
    posts,
    selectedCategory
  });
});

// Admin-only post creation form.
router.get("/new", authService.requireAdmin, (req, res) => {
  res.render("scam-weather/form", {
    activePage: "scam-weather",
    mode: "create",
    post: null,
    error: ""
  });
});

// Admin-only post creation submit.
router.post("/", authService.requireAdmin, (req, res) => {
  const result = scamWeatherService.createPost(req.currentUser, req.body);

  if (!result.success) {
    return res.status(400).render("scam-weather/form", {
      activePage: "scam-weather",
      mode: "create",
      post: req.body,
      error: result.message
    });
  }

  res.redirect("/scam-weather");
});

// Edit form: currently admins will use this, but author ownership is checked too.
router.get("/:id/edit", authService.requireLogin, (req, res) => {
  const post = scamWeatherService.getPostById(req.params.id);

  if (!post) {
    return res.status(404).render("scam-weather/forbidden", {
      activePage: "scam-weather",
      title: "Post not found"
    });
  }

  if (!scamWeatherService.canEditPost(req.currentUser, post)) {
    return res.status(403).render("scam-weather/forbidden", {
      activePage: "scam-weather",
      title: "Not your post"
    });
  }

  res.render("scam-weather/form", {
    activePage: "scam-weather",
    mode: "edit",
    post,
    error: ""
  });
});

// Edit submit.
router.post("/:id/edit", authService.requireLogin, (req, res) => {
  const result = scamWeatherService.updatePost(req.currentUser, req.params.id, req.body);

  if (!result.success) {
    return res.status(400).render("scam-weather/form", {
      activePage: "scam-weather",
      mode: "edit",
      post: { id: req.params.id, ...req.body },
      error: result.message
    });
  }

  res.redirect("/scam-weather");
});

// Delete submit.
router.post("/:id/delete", authService.requireLogin, (req, res) => {
  scamWeatherService.deletePost(req.currentUser, req.params.id);
  res.redirect("/scam-weather");
});

module.exports = router;
