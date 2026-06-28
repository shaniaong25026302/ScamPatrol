const express = require("express");
const { getAllCases } = require("../models/case.model");

const router = express.Router();

router.get("/", async (req, res) => {
  const cases = await getAllCases();

  console.log(cases);
  
  res.render("cases/list", {
    title: "Community Watch",
    activePage: "cases",
    cases
  });
});

router.get("/:id", (req, res) => {
  const scam = {
    id: req.params.id,
    title: "Fake Job Scam",
    description: "Recruiter asked me for money through Telegram"
  };

  res.render("cases/detail", {
    title: scam.title,
    scam
  });
});

module.exports = router;