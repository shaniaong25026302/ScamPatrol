const express = require("express");
const router = express.Router();

const caseController = require("../controllers/caseController");
const upload = require("../middleware/upload");

router.post("/", upload.single("image"), caseController.createCase);

router.get("/edit/:id", caseController.showEditPage);

router.post("/edit/:id", upload.single("image"), caseController.updateCase);

router.post("/delete/:id", caseController.deleteCase);

module.exports = router;