const express = require("express");
const pointsService = require("../services/pointsService");

const router = express.Router();

function sendEventResponse(req, res, eventType) {
  const result = pointsService.handleEvent({
    userId: req.body.userId,
    username: req.body.username,
    eventType,
    relatedType: req.body.relatedType,
    relatedId: req.body.relatedId,
    reason: req.body.reason
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
}

// GET /api/points/leaderboard
router.get("/leaderboard", (req, res) => {
  res.json({
    success: true,
    leaderboard: pointsService.getLeaderboard()
  });
});

// GET /api/points/config
router.get("/config", (req, res) => {
  res.json({
    success: true,
    config: pointsService.getPointsConfig()
  });
});

// GET /api/points/users/:userId
router.get("/users/:userId", (req, res) => {
  const user = pointsService.getUserProgress(req.params.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.json({ success: true, user });
});

// GET /api/points/users/:userId/transactions
router.get("/users/:userId/transactions", (req, res) => {
  res.json({
    success: true,
    transactions: pointsService.getTransactionsForUser(req.params.userId)
  });
});

// Generic internal event endpoint.
// Teammates can call this from auth/report/comment/admin features.
// Example body: { "userId": 12, "username": "Aisha", "eventType": "REPORT_SUBMITTED" }
router.post("/event", (req, res) => {
  return sendEventResponse(req, res, req.body.eventType);
});

// Backwards-compatible endpoint if older code says { action: "CASE_SUBMITTED" }.
router.post("/award", (req, res) => {
  return sendEventResponse(req, res, req.body.action || req.body.eventType);
});

// Convenience endpoints for teammates.
router.post("/account-created", (req, res) => sendEventResponse(req, res, "ACCOUNT_CREATED"));
router.post("/report-submitted", (req, res) => sendEventResponse(req, res, "REPORT_SUBMITTED"));
router.post("/comment-posted", (req, res) => sendEventResponse(req, res, "COMMENT_POSTED"));
router.post("/case-verified", (req, res) => sendEventResponse(req, res, "CASE_VERIFIED"));
router.post("/upvote-received", (req, res) => sendEventResponse(req, res, "UPVOTE_RECEIVED"));
router.post("/content-removed", (req, res) => sendEventResponse(req, res, "CONTENT_REMOVED"));

module.exports = router;
