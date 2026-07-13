// <Liam Member 5 Daily Quiz Start>
// src/routes/dailyquiz.api.routes.js — JSON endpoints for the automated Daily Quiz.
// Mounted at /api/daily-quiz. Page rendering lives in dailyquiz.pages.routes.js.
const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth.middleware");
const dailyQuiz = require("../services/dailyquiz.service");

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/daily-quiz/status
// Lightweight endpoint used by the navbar on every page load. It lets the nav
// show ready / in-progress / completed without hardcoding status in EJS.
router.get("/status", requireAuth, (req, res) => {
  const status = dailyQuiz.getStatus(req.user.id);
  return res.json({ ok: true, status });
});

// GET /api/daily-quiz/today
// Returns today's 10 generated questions WITHOUT the correct answer index.
// The server keeps the answer key and checks answers through /answer.
router.get("/today", requireAuth, h(async (req, res) => {
  const quiz = await dailyQuiz.getTodayForUser(req.user.id, {
    forceRefresh: req.query.force === "1"
  });
  return res.json({ ok: true, quiz });
}));

// POST /api/daily-quiz/answer
// Body: { questionId, selectedIndex }
// Progress is saved after every answer, so refreshes do not reset the quiz.
router.post("/answer", requireAuth, h(async (req, res) => {
  const result = await dailyQuiz.answerQuestion(req.user.id, req.body.questionId, req.body.selectedIndex);
  if (!result.ok) return res.status(result.status || 400).json(result);
  return res.json(result);
}));

module.exports = router;
// <Liam Member 5 Daily Quiz End>
