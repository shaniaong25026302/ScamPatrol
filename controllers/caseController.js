const caseModel = require("../models/caseModel");

// Create a new scam case
exports.createCase = (req, res) => {
    const caseData = {
        title: req.body.title,
        description: req.body.description,
        category_id: req.body.category_id,
        platform: req.body.platform,
        scam_date: req.body.scam_date,
        user_id: 1,
        image: req.file ? req.file.filename : null
    };

    caseModel.createCase(caseData, (err, result) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Error creating scam case.");
        }

        if (req.file) {

            caseModel.saveImage(
                result.insertId,
                req.file.filename,
                (err) => {

                    if (err) {
                        console.error(err);
                    }

                    res.redirect("/");
                }
            );

        } else {

            res.redirect("/");

        }

    });
};

// Show edit page
exports.showEditPage = (req, res) => {

    const id = req.params.id;

    caseModel.getCaseById(id, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Error loading case.");
        }

        if (results.length === 0) {
            return res.status(404).send("Case not found.");
        }

        res.render("editScam", {
            caseData: results[0]
        });

    });

};


// Update a scam case
exports.updateCase = (req, res) => {
    const id = req.params.id;

    const caseData = {
        title: req.body.title,
        description: req.body.description,
        category_id: req.body.category_id,
        platform: req.body.platform,
        scam_date: req.body.scam_date
    };

    caseModel.updateCase(id, caseData, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error updating scam case.");
        }

        res.redirect("/");
    });
};

// Delete a scam case
exports.deleteCase = (req, res) => {
    const id = req.params.id;

    caseModel.deleteCase(id, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error deleting scam case.");
        }

        res.redirect("/");
    });
};