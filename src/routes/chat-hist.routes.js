// <Shawn Start>
const express = require("express");
const router = express.Router();

const chatHistController = require("../controllers/chat-hist.controller");
const { requireAuth } = require("../middleware/auth.middleware");

// Get all chat sessions
router.get(
  "/sessions",
  requireAuth,
  chatHistController.getSessions
);

// Get messages from one chat session
router.get(
  "/:id",
  requireAuth,
  chatHistController.getMessages
);

// Pin / Unpin a chat session
router.post(
  "/:id/pin",
  requireAuth,
  chatHistController.pinSession
);

module.exports = router;
// <Shawn End>