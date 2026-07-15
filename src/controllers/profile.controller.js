// <CG Start>
// src/controllers/profile.controller.js

const User = require("../models/user.model");

// GET /profile
async function showProfile(req, res) {
    try {
        const user = await User.getUserById(req.user.id);

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("profile", {
            title: "My Profile",
            activePage: "profile",
            user,
            comments: []
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}

// POST /profile
async function updateProfile(req, res) {
    try {
        await User.updateUserProfile(req.user.id, {
            username: req.body.username,
            email: req.body.email,
            bio: req.body.bio,
            avatar_url: req.body.avatar_url
        });

        res.redirect("/profile");

    } catch (err) {
        console.error(err);
        res.status(500).send("Unable to update profile");
    }
}

module.exports = {
    showProfile,
    updateProfile
};

// <CG End>
