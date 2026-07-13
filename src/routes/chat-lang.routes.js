// <%# CG Member 4 Start %>
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// Start chat: set language preference
router.post("/chat/start", (req, res) => {
  const { language } = req.body;
  const supported = ["en", "zh", "ms", "ta", "ja", "es", "ko"];
  if (!supported.includes(language)) {
    return res.status(400).send("Unsupported language");
  }
  req.session.chatLang = language;
  res.redirect("/chat");
});

// Send message: reply in selected language
router.post("/chat/message", async (req, res) => {
  const { message } = req.body;
  const language = req.session.chatLang || "en";

  try {
    // Call AI chatbot service with language parameter
    const reply = await generateChatbotReply(message, language);

    // Save chat history
    await pool.query(
      "INSERT INTO chatbot_history (user_id, language, user_message, bot_reply, created_at) VALUES (?, ?, ?, ?, NOW())",
      [req.session.user.id, language, message, reply]
    );

    res.json({ reply, language });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).send("Error generating reply");
  }
});

// Dummy AI reply function (replace with real API call)
async function generateChatbotReply(message, language) {
  return `[${language}] Reply: ${message}`;
}

module.exports = router;
// <%# CG Member 4 End %>
