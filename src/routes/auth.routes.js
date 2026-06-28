// <Shania Start>
// src/routes/auth.routes.js — JSON API, mounted at /api/auth.
const express = require("express");
const c = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

// Wrap async handlers so rejections reach the error handler (works on Express 4 + 5).
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = express.Router();

router.post("/register", h(c.register));
router.post("/login", h(c.login));
router.post("/logout", h(c.logout));
router.post("/forgot-password", h(c.forgotPassword));
router.post("/reset-password", h(c.resetPassword));
router.post("/refresh", h(c.refresh));
router.get("/me", requireAuth, h(c.me));

module.exports = router;
// <Shania End>
