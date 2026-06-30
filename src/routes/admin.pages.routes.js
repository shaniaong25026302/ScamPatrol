const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.render("admin/dashboard", {
        title: "Admin Dashboard",
        activePage: "admin"
    });
});

router.get("/cases", (req, res) => {
    res.render("admin/cases", {
        title: "Verify Cases",
        activePage: "admin"
    });
});

router.get("/users", (req, res) => {
    res.render("admin/users", {
        title: "Manage Users",
        activePage: "admin"
    });
});

router.get("/reports", (req, res) => {
    res.render("admin/reports", {
        title: "Flagged Reports",
        activePage: "admin"
    });
});

router.get("/glossary", (req, res) => {
    res.render("admin/glossary", {
        title: "Scam Glossary",
        activePage: "admin"
    });
});

router.get("/glossary/new", (req, res) => {
    res.render("admin/glossary-new", {
        title: "Add Glossary Entry",
        activePage: "admin"
    });
});

module.exports = router;