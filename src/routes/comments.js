<%# <CG Member 4 Start> %>
const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/:caseId/comments", async (req, res) => {
  const { content } = req.body;
  const caseId = req.params.caseId;
  const userId = req.session.user ? req.session.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    await db.query(
      "INSERT INTO comments (case_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())",
      [caseId, userId, content]
    );
    res.redirect(`/cases/${caseId}`);
  } catch (err) {
    console.error("Error posting comment:", err);
    res.status(500).send("Error posting comment");
  }
});

router.post("/comments/:commentId/edit", async (req, res) => {
  const { content } = req.body;
  const commentId = req.params.commentId;
  const userId = req.session.user ? req.session.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    await db.query(
      "UPDATE comments SET content=?, updated_at=NOW() WHERE id=? AND user_id=?",
      [content, commentId, userId]
    );
    res.redirect("back");
  } catch (err) {
    console.error("Error editing comment:", err);
    res.status(500).send("Error editing comment");
  }
});

router.post("/comments/:commentId/delete", async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.session.user ? req.session.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    await db.query("DELETE FROM comments WHERE id=? AND user_id=?", [
      commentId,
      userId,
    ]);
    res.redirect("back");
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).send("Error deleting comment");
  }
});

module.exports = router;
<%# <CG Member 4 End> %>
