// <Liam Member 5 Daily Quiz Start>
// src/routes/dailyquiz.pages.routes.js — EJS page for the Daily Quiz feature.
const express = require("express");
const router = express.Router();

const dailyQuiz = require("../services/dailyquiz.service");

// GET /daily-quiz
// The route renders the shell immediately. public/js/daily-quiz.js then fetches
// /api/daily-quiz/today to load the generated questions and saved progress.
router.get("/", (req, res) => {
  const status = dailyQuiz.getStatus(req.user.id);
  res.render("daily-quiz/index", {
    title: "Daily Quiz · Scam Patrol HQ",
    activePage: "daily-quiz",
    initialStatus: status
  });
});

module.exports = router;
// <Liam Member 5 Daily Quiz End>
