// <Rebecca Member 2 Start>
// Member 2 controller: Report Scam form, create/update/delete cases, and categories API.
const caseModel = require("../models/case.model");

function getUploadedImagePaths(req) {
  if (!req.files || req.files.length === 0) return [];
  return req.files.map((file) => `/uploads/${file.filename}`);
}

function validateCasePayload(body) {
  const errors = [];

  if (!body.title || body.title.trim().length < 5) {
    errors.push("Title must be at least 5 characters.");
  }

  if (!body.description || body.description.trim().length < 20) {
    errors.push("Description must be at least 20 characters.");
  }

  if (!body.category_id) {
    errors.push("Please choose a scam category.");
  }

  return errors;
}

function buildCaseData(req) {
  return {
    title: req.body.title,
    description: req.body.description,
    category_id: req.body.category_id,
    platform: req.body.platform,
    scam_date: req.body.scam_date,
    user_id: req.user ? req.user.id : null
  };
}

function canEditCase(req, scam) {
  if (!scam) return false;
  if (!req.user) return true; // allowed for class/demo until auth is fully integrated
  if (req.user.role === "admin") return true;
  if (!scam.user_id) return true;
  return Number(scam.user_id) === Number(req.user.id);
}

async function renderCaseForm(res, options = {}) {
  const categories = await caseModel.getCategories();

  return res.render(options.view, {
    title: options.title,
    activePage: "report",
    categories,
    caseData: options.caseData || {},
    errors: options.errors || [],
    formAction: options.formAction,
    submitLabel: options.submitLabel
  });
}

exports.showNewCaseForm = async (req, res, next) => {
  try {
    await renderCaseForm(res, {
      view: "cases/new",
      title: "Report a Scam",
      formAction: "/cases",
      submitLabel: "Submit Scam Report"
    });
  } catch (err) {
    next(err);
  }
};

exports.createCasePage = async (req, res, next) => {
  try {
    const errors = validateCasePayload(req.body);

    if (errors.length > 0) {
      return renderCaseForm(res, {
        view: "cases/new",
        title: "Report a Scam",
        caseData: req.body,
        errors,
        formAction: "/cases",
        submitLabel: "Submit Scam Report"
      });
    }

    const scam = await caseModel.createCase(buildCaseData(req), getUploadedImagePaths(req));
    return res.redirect(`/cases/${scam.id}?success=created`);
  } catch (err) {
    next(err);
  }
};

exports.showEditCaseForm = async (req, res, next) => {
  try {
    const scam = await caseModel.getCaseById(req.params.id);

    if (!scam) {
      return res.status(404).send("Case not found.");
    }

    if (!canEditCase(req, scam)) {
      return res.status(403).send("You can only edit your own scam report.");
    }

    return renderCaseForm(res, {
      view: "cases/edit",
      title: "Edit Scam Report",
      caseData: scam,
      formAction: `/cases/${scam.id}/edit`,
      submitLabel: "Update Scam Report"
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCasePage = async (req, res, next) => {
  try {
    const scam = await caseModel.getCaseById(req.params.id);

    if (!scam) {
      return res.status(404).send("Case not found.");
    }

    if (!canEditCase(req, scam)) {
      return res.status(403).send("You can only edit your own scam report.");
    }

    const errors = validateCasePayload(req.body);

    if (errors.length > 0) {
      return renderCaseForm(res, {
        view: "cases/edit",
        title: "Edit Scam Report",
        caseData: { ...scam, ...req.body },
        errors,
        formAction: `/cases/${scam.id}/edit`,
        submitLabel: "Update Scam Report"
      });
    }

    await caseModel.updateCase(req.params.id, buildCaseData(req), getUploadedImagePaths(req));
    return res.redirect(`/cases/${req.params.id}?success=updated`);
  } catch (err) {
    next(err);
  }
};

exports.deleteCasePage = async (req, res, next) => {
  try {
    const scam = await caseModel.getCaseById(req.params.id);

    if (!scam) {
      return res.status(404).send("Case not found.");
    }

    if (!canEditCase(req, scam)) {
      return res.status(403).send("You can only delete your own scam report.");
    }

    await caseModel.deleteCase(req.params.id);
    return res.redirect("/cases?success=deleted");
  } catch (err) {
    next(err);
  }
};

exports.getCategoriesApi = async (req, res, next) => {
  try {
    const categories = await caseModel.getCategories();
    return res.json({ categories });
  } catch (err) {
    next(err);
  }
};

exports.createCaseApi = async (req, res, next) => {
  try {
    const errors = validateCasePayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const scam = await caseModel.createCase(buildCaseData(req), getUploadedImagePaths(req));
    return res.status(201).json({ message: "Case created successfully.", case: scam });
  } catch (err) {
    next(err);
  }
};

exports.updateCaseApi = async (req, res, next) => {
  try {
    const scam = await caseModel.getCaseById(req.params.id);

    if (!scam) {
      return res.status(404).json({ error: "Case not found." });
    }

    if (!canEditCase(req, scam)) {
      return res.status(403).json({ error: "You can only update your own scam report." });
    }

    const errors = validateCasePayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const updatedCase = await caseModel.updateCase(req.params.id, buildCaseData(req), getUploadedImagePaths(req));
    return res.json({ message: "Case updated successfully.", case: updatedCase });
  } catch (err) {
    next(err);
  }
};

exports.deleteCaseApi = async (req, res, next) => {
  try {
    const scam = await caseModel.getCaseById(req.params.id);

    if (!scam) {
      return res.status(404).json({ error: "Case not found." });
    }

    if (!canEditCase(req, scam)) {
      return res.status(403).json({ error: "You can only delete your own scam report." });
    }

    await caseModel.deleteCase(req.params.id);
    return res.json({ message: "Case deleted successfully." });
  } catch (err) {
    next(err);
  }
};
// <Rebecca Member 2 End>
