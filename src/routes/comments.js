// <CG Member 4 Start>
const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /cases/:caseId/comments
router.post("/:caseId/comments", async (req, res) => {
  const { content } = req.body;
  const caseId = req.params.caseId;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    await db.query(
      `
      INSERT INTO comments
      (case_id, user_id, content, created_at)
      VALUES (?, ?, ?, NOW())
      `,
      [caseId, userId, content]
    );

    return res.redirect(`/cases/${caseId}`);
  } catch (err) {
    console.error("Error posting comment:", err);
    return res.status(500).send("Error posting comment");
  }
});

// POST /comments/:commentId/edit
router.post("/comments/:commentId/edit", async (req, res) => {
  const { content } = req.body;
  const commentId = req.params.commentId;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    await db.query(
      `
      UPDATE comments
      SET content = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [content, commentId, userId]
    );

    return res.redirect("back");
  } catch (err) {
    console.error("Error editing comment:", err);
    return res.status(500).send("Error editing comment");
  }
});

// POST /comments/:commentId/delete
router.post("/comments/:commentId/delete", async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    await db.query(
      `
      DELETE FROM comments
      WHERE id = ? AND user_id = ?
      `,
      [commentId, userId]
    );

    return res.redirect("back");
  } catch (err) {
    console.error("Error deleting comment:", err);
    return res.status(500).send("Error deleting comment");
  }
});

module.exports = router;
// <CG Member 4 End>
