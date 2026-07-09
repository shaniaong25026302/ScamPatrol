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

function requireDraftUser(req, res) {
  if (req.user && req.user.id) return req.user.id;
  res.redirect(`/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
  return null;
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
    submitLabel: options.submitLabel,
    saveDraftAction: options.saveDraftAction,
    deleteDraftAction: options.deleteDraftAction,
    isDraft: options.isDraft || false
  });
}

exports.showNewCaseForm = async (req, res, next) => {
  try {
    await renderCaseForm(res, {
      view: "cases/new",
      title: "Report a Scam",
      formAction: "/cases",
      submitLabel: "Submit Scam Report",
      saveDraftAction: "/cases/drafts"
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
        submitLabel: "Submit Scam Report",
        saveDraftAction: "/cases/drafts"
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


exports.listDraftsPage = async (req, res, next) => {
  try {
    const userId = requireDraftUser(req, res);
    if (!userId) return;

    const drafts = await caseModel.getDraftsByUser(userId);

    return res.render("cases/drafts", {
      title: "Saved Scam Drafts",
      activePage: "cases",
      drafts,
      success: req.query.success
    });
  } catch (err) {
    next(err);
  }
};

exports.saveDraftPage = async (req, res, next) => {
  try {
    const userId = requireDraftUser(req, res);
    if (!userId) return;

    await caseModel.createDraft({ ...buildCaseData(req), user_id: userId });
    return res.redirect("/cases/drafts?success=saved");
  } catch (err) {
    next(err);
  }
};

// Auto-save lets users keep unfinished reports without clicking Save as Draft manually.
// It intentionally saves text fields only; evidence images are still handled by the normal submit/save buttons.
exports.autoSaveDraftPage = async (req, res, next) => {
  try {
    const userId = requireDraftUser(req, res);
    if (!userId) return;

    const payload = { ...buildCaseData(req), user_id: userId };
    const draftId = req.params.id || req.body.draft_id;

    let draft;
    if (draftId) {
      const existingDraft = await caseModel.getDraftById(draftId, userId);
      if (!existingDraft) {
        return res.status(404).json({ error: "Draft not found." });
      }
      draft = await caseModel.updateDraft(draftId, payload);
    } else {
      const hasTypedAnything = [
        payload.title,
        payload.description,
        payload.category_id,
        payload.platform,
        payload.scam_date
      ].some((value) => value !== undefined && value !== null && String(value).trim() !== "");

      if (!hasTypedAnything) {
        return res.json({ skipped: true, message: "Nothing to auto-save yet." });
      }

      draft = await caseModel.createDraft(payload);
    }

    return res.json({
      message: "Draft auto-saved.",
      draftId: draft.id,
      updatedAt: draft.updated_at || new Date()
    });
  } catch (err) {
    next(err);
  }
};

exports.showDraftForm = async (req, res, next) => {
  try {
    const userId = requireDraftUser(req, res);
    if (!userId) return;

    const draft = await caseModel.getDraftById(req.params.id, userId);

    if (!draft) {
      return res.status(404).send("Draft not found.");
    }

    return renderCaseForm(res, {
      view: "cases/new",
      title: "Continue Scam Draft",
      caseData: draft,
      formAction: `/cases/drafts/${draft.id}/submit`,
      saveDraftAction: `/cases/drafts/${draft.id}`,
      deleteDraftAction: `/cases/drafts/${draft.id}/delete`,
      submitLabel: "Submit Scam Report",
      isDraft: true
    });
  } catch (err) {
    next(err);
  }
};

exports.updateDraftPage = async (req, res, next) => {
  try {
    const userId = requireDraftUser(req, res);
    if (!userId) return;

    const draft = await caseModel.getDraftById(req.params.id, userId);

    if (!draft) {
      return res.status(404).send("Draft not found.");
    }

    await caseModel.updateDraft(req.params.id, { ...buildCaseData(req), user_id: userId });
    return res.redirect("/cases/drafts?success=saved");
  } catch (err) {
    next(err);
  }
};

exports.submitDraftPage = async (req, res, next) => {
  try {
    const userId = requireDraftUser(req, res);
    if (!userId) return;

    const draft = await caseModel.getDraftById(req.params.id, userId);

    if (!draft) {
      return res.status(404).send("Draft not found.");
    }

    const errors = validateCasePayload(req.body);

    if (errors.length > 0) {
      return renderCaseForm(res, {
        view: "cases/new",
        title: "Continue Scam Draft",
        caseData: { ...draft, ...req.body },
        errors,
        formAction: `/cases/drafts/${draft.id}/submit`,
        saveDraftAction: `/cases/drafts/${draft.id}`,
        deleteDraftAction: `/cases/drafts/${draft.id}/delete`,
        submitLabel: "Submit Scam Report",
        isDraft: true
      });
    }

    const scam = await caseModel.submitDraft(req.params.id, { ...buildCaseData(req), user_id: userId }, getUploadedImagePaths(req));
    return res.redirect(`/cases/${scam.id}?success=created`);
  } catch (err) {
    next(err);
  }
};

exports.deleteDraftPage = async (req, res, next) => {
  try {
    const userId = requireDraftUser(req, res);
    if (!userId) return;

    await caseModel.deleteDraft(req.params.id, userId);
    return res.redirect("/cases/drafts?success=deleted");
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
