// <Shawn Start>
const express = require("express");
const glossaryModel = require("../models/glossary.model");
const userModel = require("../models/user.model");
const caseModel = require("../models/case.model");

const router = express.Router();

// Dashboard
router.get("/", (req, res) => {
    res.render("admin/dashboard", {
        title: "Admin Dashboard",
        activePage: "admin"
    });
});

// Verify Cases
router.get("/cases", async (req, res) => {

    try {

        const cases = await caseModel.getAllCases();

        res.render("admin/cases", {
            title: "Verify Cases",
            activePage: "admin",
            cases
        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Database Error");

    }

});

// Manage Users
router.get("/users", async (req, res) => {

    try {

        const users = await userModel.getAllUsers();

        res.render("admin/users", {
            title: "Manage Users",
            activePage: "admin",
            users
        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Database Error");

    }

});

// Flagged Reports
router.get("/reports", (req, res) => {
    res.render("admin/reports", {
        title: "Flagged Reports",
        activePage: "admin"
    });
});

// ======================
// GLOSSARY CRUD
// ======================

// Read All
router.get("/glossary", async (req, res) => {
    try {
        const glossary = await glossaryModel.getAllGlossary();

        res.render("admin/glossary", {
            title: "Scam Glossary",
            activePage: "admin",
            glossary
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

// Create Page
router.get("/glossary/new", (req, res) => {
    res.render("admin/glossary-new", {
        title: "Add Glossary Entry",
        activePage: "admin"
    });
});

// Create
router.post("/glossary/new", async (req, res) => {
    try {

        const { term, description, prevention } = req.body;

        await glossaryModel.createGlossary(
            term,
            description,
            prevention
        );

        res.redirect("/admin/glossary");

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

// Edit Page
router.get("/glossary/edit/:id", async (req, res) => {
    try {

        const glossary = await glossaryModel.getGlossaryById(req.params.id);

        res.render("admin/glossary-edit", {
            title: "Edit Glossary Entry",
            activePage: "admin",
            glossary
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

// Update
router.post("/glossary/edit/:id", async (req, res) => {
    try {

        const { term, description, prevention } = req.body;

        await glossaryModel.updateGlossary(
            req.params.id,
            term,
            description,
            prevention
        );

        res.redirect("/admin/glossary");

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

// Delete
router.post("/glossary/delete/:id", async (req, res) => {
    try {

        await glossaryModel.deleteGlossary(req.params.id);

        res.redirect("/admin/glossary");

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

module.exports = router;
// <Shawn End>