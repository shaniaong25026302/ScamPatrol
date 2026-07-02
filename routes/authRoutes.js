const express = require("express");
const authService = require("../services/authService");

const router = express.Router();

// Login form
router.get("/login", (req, res) => {
  res.render("auth/login", {
    activePage: "login",
    message: req.query.message || "",
    error: ""
  });
});

// Login submit
router.post("/login", (req, res) => {
  const result = authService.login(req.body);

  if (!result.success) {
    return res.status(401).render("auth/login", {
      activePage: "login",
      message: "",
      error: result.message
    });
  }

  authService.setLoginCookie(res, result.user);
  res.redirect("/scam-weather");
});

// Signup form
router.get("/signup", (req, res) => {
  res.render("auth/signup", {
    activePage: "signup",
    error: ""
  });
});

// Signup submit: all new signups are normal users by default.
router.post("/signup", (req, res) => {
  const result = authService.signup(req.body);

  if (!result.success) {
    return res.status(400).render("auth/signup", {
      activePage: "signup",
      error: result.message
    });
  }

  authService.setLoginCookie(res, result.user);
  res.redirect("/scam-weather");
});

// Logout clears the local demo auth cookie.
router.get("/logout", (req, res) => {
  authService.clearLoginCookie(res);
  res.redirect("/");
});

module.exports = router;
