// <Shawn Start>
const express = require("express");
const glossaryModel = require("../models/glossary.model");

const router = express.Router();

router.get("/", async (req, res) => {

    try {

        const glossary = await glossaryModel.getAllGlossary();

        console.log(glossary);

        res.render("glossary", {
            title: "Scam Glossary · Scam Patrol",
            activePage: "glossary",
            glossary
        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Database Error");

    }

});

module.exports = router;
// <Shawn End>