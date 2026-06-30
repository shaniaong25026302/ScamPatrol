const connection = require("../configs/db");

// Create a new scam case
const createCase = (caseData, callback) => {
    const sql = `
        INSERT INTO scam_cases
        (title, description, category_id, platform, scam_date, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(
        sql,
        [
            caseData.title,
            caseData.description,
            caseData.category_id,
            caseData.platform,
            caseData.scam_date,
            caseData.user_id
        ],
        callback
    );
};

// Update a scam case
const updateCase = (id, caseData, callback) => {
    const sql = `
        UPDATE scam_cases
        SET
            title = ?,
            description = ?,
            category_id = ?,
            platform = ?,
            scam_date = ?
        WHERE id = ?
    `;

    connection.query(
        sql,
        [
            caseData.title,
            caseData.description,
            caseData.category_id,
            caseData.platform,
            caseData.scam_date,
            id
        ],
        callback
    );
};


// Delete a scam case
const deleteCase = (id, callback) => {
    const sql = `
        DELETE FROM scam_cases
        WHERE id = ?
    `;

    connection.query(sql, [id], callback);
};

const saveImage = (caseId, filename, callback) => {

    const sql = `
        INSERT INTO case_images
        (case_id, image_path)
        VALUES (?, ?)
    `;

    connection.query(
        sql,
        [caseId, filename],
        callback
    );

};

// Get one scam case by ID
const getCaseById = (id, callback) => {

    const sql = `
        SELECT *
        FROM scam_cases
        WHERE id = ?
    `;

    connection.query(sql, [id], callback);

};

module.exports = {
    createCase,
    updateCase,
    deleteCase,
    saveImage,
    getCaseById
};