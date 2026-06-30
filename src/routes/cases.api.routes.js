// <Rebecca Member 2 Start>
// API routes owned by Member 2.
const express = require("express");
const caseController = require("../controllers/case.controller");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

router.post("/", upload.array("images", 3), caseController.createCaseApi);
router.put("/:id", upload.array("images", 3), caseController.updateCaseApi);
router.delete("/:id", caseController.deleteCaseApi);

module.exports = router;
// <Rebecca Member 2 End>
