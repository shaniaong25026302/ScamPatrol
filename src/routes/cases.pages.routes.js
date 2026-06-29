const express = require("express");
const {
  getAllCases,
  searchCases,
  getCasesByCategory,
  getSortedCases,
  getCaseById,
  addVote,
  addFlag
} = require("../models/case.model");

const router = express.Router();

router.get("/", async (req, res) => {
  const search = req.query.search;
  const category = req.query.category;
  const sort = req.query.sort;

  let cases;

  if (search) {
    cases = await searchCases(search);
  } else if (category) {
    cases = await getCasesByCategory(category);
  } else if (sort) {
    cases = await getSortedCases(sort);
  } else {
    cases = await getAllCases();
  }

  res.render("cases/list", {
    title: "Community Watch",
    activePage: "cases",
    cases
  });
});

router.get("/:id", async (req, res) => {

  const scam = await getCaseById(req.params.id);

  res.render("cases/detail", {
    title: scam.title,
    scam,
    success: req.query.success
  });

});

router.post("/:id/vote", async (req, res) => {
  await addVote(req.params.id);

  res.redirect(`/cases/${req.params.id}?success=vote`);
});

router.post("/:id/flag", async (req, res) => {
  await addFlag(req.params.id);

  res.redirect(`/cases/${req.params.id}?success=flag`);
});

module.exports = router;