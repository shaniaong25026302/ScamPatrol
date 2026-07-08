// <%# CG Member 4 Start%>
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.redirect("/auth/login");
  }

  try {
    const [comments] = await db.query(
      "SELECT * FROM comments WHERE user_id=? ORDER BY created_at DESC",
      [user.id]
    );

    res.render("profile", {
      user,
      comments
    });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).send("Error loading profile");
  }
});

// ✅ Edit profile page
router.get("/edit", (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.redirect("/auth/login");
  }
  res.render("profile-edit", { user });
});

router.post("/edit", async (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.redirect("/auth/login");
  }

  const { username, email } = req.body;

  try {
    await db.query(
      "UPDATE users SET username=?, email=? WHERE id=?",
      [username, email, user.id]
    );

    req.session.user.username = username;
    req.session.user.email = email;

    res.redirect("/profile");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Error updating profile");
  }
});

module.exports = router;
//  <%# CG Member 4 End%>
