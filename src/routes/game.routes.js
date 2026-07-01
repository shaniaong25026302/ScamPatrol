// <Shania Start>
// src/routes/game.routes.js — Scam Patrol HQ JSON API, mounted at /api/game.
const express = require("express");
const c = require("../controllers/game.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const router = express.Router();

router.get("/profile", requireAuth, h(c.profile));
router.get("/leaderboard", h(c.leaderboard));
router.post("/mission/start", requireAuth, h(c.missionStart));
router.post("/mission/check", h(c.missionCheck));
router.post("/roast", h(c.roast));
router.post("/challenge/complete", requireAuth, h(c.completeChallenge));
router.post("/story/complete", h(c.storyComplete));
router.get("/shop", requireAuth, h(c.getShop));
router.post("/shop/buy", requireAuth, h(c.buyItem));
router.post("/shop/equip", requireAuth, h(c.equipItem));

module.exports = router;
// <Shania End>
