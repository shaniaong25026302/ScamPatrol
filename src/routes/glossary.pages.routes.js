const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("glossary", {
    title: "Scam Glossary · Scam Patrol",
    activePage: "glossary",
  });
});

module.exports = router;