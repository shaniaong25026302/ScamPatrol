// <CG Member 4 Start>
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// POST /cases/:caseId/comments
router.post("/:caseId/comments", async (req, res) => {
  const { content } = req.body;
  const caseId = req.params.caseId;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    await pool.query(
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
router.post("/:commentId/edit", async (req, res) => {
  const { content } = req.body;
  const commentId = req.params.commentId;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    const [rows] = await pool.query(
      "SELECT case_id FROM comments WHERE id = ?",
      [commentId]
    );

    if (!rows.length) {
      return res.status(404).send("Comment not found.");
    }

    const caseId = rows[0].case_id;

    await pool.query(
      `
      UPDATE comments
      SET content = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [content, commentId, userId]
    );

    return res.redirect(`/cases/${caseId}`);
  } catch (err) {
    console.error("Error editing comment:", err);
    return res.status(500).send("Error editing comment");
  }
});

// POST /comments/:commentId/delete
router.post("/:commentId/delete", async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  try {
    const [rows] = await pool.query(
      "SELECT case_id FROM comments WHERE id = ?",
      [commentId]
    );

    if (!rows.length) {
      return res.status(404).send("Comment not found.");
    }

    const caseId = rows[0].case_id;

    await pool.query(
      `
      DELETE FROM comments
      WHERE id = ? AND user_id = ?
      `,
      [commentId, userId]
    );

    return res.redirect(`/cases/${caseId}`);
  } catch (err) {
    console.error("Error deleting comment:", err);
    return res.status(500).send("Error deleting comment");
  }
});

module.exports = router;
// <CG Member 4 End>