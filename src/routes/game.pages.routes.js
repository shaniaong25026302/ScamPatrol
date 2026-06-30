// <Shania Start>
// src/routes/game.pages.routes.js — Scam Patrol HQ game pages.
const express = require("express");
const router = express.Router();

router.get("/hq", (req, res) =>
  res.render("game/hq", { title: "Scam Patrol HQ", activePage: "hq", layout: "game-layout" }),
);
router.get("/missions", (req, res) =>
  res.render("game/missions", { title: "Field Missions · Scam Patrol HQ", activePage: "missions", layout: "game-layout" }),
);
router.get("/dojo", (req, res) =>
  res.render("game/dojo", { title: "Dojo · Scam Patrol HQ", activePage: "dojo", layout: "game-layout" }),
);
router.get("/leaderboard", (req, res) =>
  res.render("game/leaderboard", { title: "World Leaderboard · Scam Patrol HQ", activePage: "leaderboard", layout: "game-layout" }),
);
router.get("/relationship", (req, res) =>
  res.render("game/relationship", { title: "Long-Con Detector · Scam Patrol HQ", activePage: "relationship", layout: "game-layout" }),
);

module.exports = router;
// <Shania End>
