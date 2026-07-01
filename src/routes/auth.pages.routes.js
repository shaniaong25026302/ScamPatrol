// <Shania Start>
// src/routes/auth.pages.routes.js — server-rendered auth pages, mounted at /auth.
// Logged-in users are bounced away from the auth forms.
const express = require("express");

const router = express.Router();

function guestOnly(req, res, next) {
  if (req.user) return res.redirect("/");
  next();
}

router.get("/login", guestOnly, (req, res) => {
  res.render("auth/login", { title: "Log in · Scam Patrol", activePage: "login", next: req.query.next || "" });
});

router.get("/register", guestOnly, (req, res) => {
  res.render("auth/register", { title: "Create account · Scam Patrol", activePage: "register" });
});

router.get("/forgot-password", guestOnly, (req, res) => {
  res.render("auth/forgot-password", { title: "Forgot password · Scam Patrol", activePage: "" });
});

router.get("/reset-password", guestOnly, (req, res) => {
  res.render("auth/reset-password", {
    title: "Reset password · Scam Patrol",
    activePage: "",
    token: req.query.token || "",
  });
});

module.exports = router;
// <Shania End>
