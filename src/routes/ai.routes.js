// <Shania Start>
// src/routes/ai.routes.js — AI Scam Checker JSON API, mounted at /api/ai.
const express = require("express");
const c = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = express.Router();

router.post("/analyze", requireAuth, h(c.analyze)); // login required
router.get("/history", requireAuth, h(c.history));
router.post("/relationship", requireAuth, h(c.relationship)); // long-con / romance detector
router.post("/chat", requireAuth, h(c.chat)); // "Ask Inspector Hoot" chatbot

module.exports = router;
// <Shania End>
