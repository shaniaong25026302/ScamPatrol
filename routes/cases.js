const express = require("express");
const router = express.Router();

const caseController = require("../controllers/caseController");
const upload = require("../middleware/upload");

router.post(
    "/",
    upload.single("image"),
    caseController.createCase
);

router.post(
    "/edit/:id",
    upload.single("image"),
    caseController.updateCase
);

router.post(
    "/delete/:id",
    upload.single("image"),
    caseController.deleteCase
);

module.exports = router;