// <Shania Start>
// src/routes/game.pages.routes.js — Scam Patrol HQ game pages.
const express = require("express");
const router = express.Router();

router.get("/hq", (req, res) =>
  res.render("game/hq", { title: "Scam Patrol HQ", activePage: "hq" }),
);
router.get("/missions", (req, res) =>
  res.render("game/missions", { title: "Field Missions · Scam Patrol HQ", activePage: "missions" }),
);
router.get("/dojo", (req, res) =>
  res.render("game/dojo", { title: "Dojo · Scam Patrol HQ", activePage: "dojo" }),
);
router.get("/leaderboard", (req, res) =>
  res.render("game/leaderboard", { title: "World Leaderboard · Scam Patrol HQ", activePage: "leaderboard" }),
);
router.get("/relationship", (req, res) =>
  res.render("game/relationship", { title: "Long-Con Detector · Scam Patrol HQ", activePage: "relationship" }),
);
router.get("/shop", (req, res) =>
  res.render("game/shop", { title: "Gold Shop · Scam Patrol HQ", activePage: "shop" }),
);

module.exports = router;
// <Shania End>
