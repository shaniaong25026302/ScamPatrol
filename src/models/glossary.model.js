// <Shawn Start>
const { pool } = require("../db");

// Get all glossary entries
async function getAllGlossary() {
    const [rows] = await pool.query(`
        SELECT *
        FROM glossary
        ORDER BY created_at DESC
    `);

    return rows;
}

// Get one glossary entry
async function getGlossaryById(id) {
    const [rows] = await pool.query(
        "SELECT * FROM glossary WHERE id = ?",
        [id]
    );

    return rows[0];
}

// Create glossary entry
async function createGlossary(term, category, description, prevention) {
    await pool.query(
        `INSERT INTO glossary
        (term, category, description, prevention)
        VALUES (?, ?, ?, ?)`,
        [term, category, description, prevention]
    );
}

// Update glossary entry
async function updateGlossary(id, term, category, description, prevention) {
    await pool.query(
        `UPDATE glossary
        SET
            term=?,
            category=?,
            description=?,
            prevention=?
        WHERE id=?`,
        [term, category, description, prevention, id]
    );
}

// Delete glossary entry
async function deleteGlossary(id) {
    await pool.query(
        "DELETE FROM glossary WHERE id=?",
        [id]
    );
}

module.exports = {
    getAllGlossary,
    getGlossaryById,
    createGlossary,
    updateGlossary,
    deleteGlossary
};
// <Shawn End>