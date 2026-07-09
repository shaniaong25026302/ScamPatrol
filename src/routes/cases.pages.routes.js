// <Rebecca Member 2 Start>

const express = require("express");
const caseController = require("../controllers/case.controller");
const upload = require("../middleware/upload.middleware");
const {
  getAllCases,
  searchCases,
  getCasesByCategory,
  getSortedCases,
  getCaseById,
  getCategories,
  addVote,
  addFlag
} = require("../models/case.model");

const router = express.Router();

// Report Scam page + page form actions.
router.get("/drafts", caseController.listDraftsPage);
router.post("/drafts", upload.array("images", 3), caseController.saveDraftPage);
router.post("/drafts/autosave", caseController.autoSaveDraftPage);
router.get("/drafts/:id/edit", caseController.showDraftForm);
router.post("/drafts/:id/autosave", caseController.autoSaveDraftPage);
router.post("/drafts/:id", upload.array("images", 3), caseController.updateDraftPage);
router.post("/drafts/:id/submit", upload.array("images", 3), caseController.submitDraftPage);
router.post("/drafts/:id/delete", caseController.deleteDraftPage);
router.get("/new", caseController.showNewCaseForm);
router.post("/", upload.array("images", 3), caseController.createCasePage);
router.get("/:id/edit", caseController.showEditCaseForm);
router.post("/:id/edit", upload.array("images", 3), caseController.updateCasePage);
router.post("/:id/delete", caseController.deleteCasePage);
// <Rebecca Member 2 End>

// <Nivi Member 3 Start>
// Community Watch browse/search/detail/vote/flag pages.
router.get("/", async (req, res, next) => {
  try {
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

    const categories = await getCategories();

    res.render("cases/list", {
      title: "Community Watch",
      activePage: "cases",
      cases,
      categories,
      selectedCategory: category || "",
      selectedSort: sort || "",
      search: search || "",
      success: req.query.success
    });
  } catch (err) {
    next(err);
  }
});

router.get("/edit/:id", caseController.showEditCaseForm);

router.get("/:id", async (req, res, next) => {
  try {
    const scam = await getCaseById(req.params.id);

    if (!scam) {
      return res.status(404).send("Case not found.");
    }

    res.render("cases/detail", {
      title: scam.title,
      activePage: "cases",
      scam,
      success: req.query.success
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/vote", async (req, res, next) => {
  try {
    await addVote(req.params.id, req.user ? req.user.id : null);
    res.redirect(`/cases/${req.params.id}?success=vote`);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/flag", async (req, res, next) => {
  try {
    await addFlag(req.params.id, req.user ? req.user.id : null, req.body.reason);
    res.redirect(`/cases/${req.params.id}?success=flag`);
  } catch (err) {
    next(err);
  }
});
// <Nivi Member 3 End>

module.exports = router;
