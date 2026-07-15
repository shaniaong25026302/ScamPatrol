// <CG Start>
// src/routes/profile.routes.js

const express = require("express");
const router = express.Router();

const profileController = require("../controllers/profile.controller");

// Display profile page
router.get("/", profileController.showProfile);

// Update profile
router.post("/", profileController.updateProfile);

module.exports = router;

// <CG End>
