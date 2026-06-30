// <Rebecca Member 2 Start>
// API route owned by Member 2: list all scam categories.
const express = require("express");
const caseController = require("../controllers/case.controller");

const router = express.Router();

router.get("/", caseController.getCategoriesApi);

module.exports = router;
// <Rebecca Member 2 End>
