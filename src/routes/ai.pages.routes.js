// src/routes/ai.pages.routes.js — AI Scam Checker page, mounted at /ai-checker.
const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("ai-checker", { title: "AI Scam Checker · scamlah", activePage: "ai-checker" });
});

module.exports = router;
