// <Shawn Start>
const ChatHist = require("../models/chat-hist.model");

// Get all chat sessions
async function getSessions(req, res) {
    const sessions = await ChatHist.getSessions(req.user.id);
    res.json(sessions);
}

// Get messages from one session
async function getMessages(req, res) {
    const messages = await ChatHist.getMessages(req.params.id);
    res.json(messages);
}

// Pin / Unpin a session
async function pinSession(req, res) {
    await ChatHist.pinSession(
        req.params.id,
        req.body.pinned
    );

    res.json({
        success: true
    });
}

module.exports = {
    getSessions,
    getMessages,
    pinSession
};
// <Shawn End>