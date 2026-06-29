const { pool } = require("../db");

async function getAllCases() {
  const [rows] = await pool.query(`
    SELECT *
    FROM scam_cases
    ORDER BY created_at DESC
  `);

  return rows;
}

async function searchCases(keyword) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM scam_cases
    WHERE title LIKE ?
       OR description LIKE ?
    ORDER BY created_at DESC
    `,
    [`%${keyword}%`, `%${keyword}%`]
  );

  return rows;
}

async function getCasesByCategory(categoryId) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM scam_cases
    WHERE category_id = ?
    ORDER BY created_at DESC
    `,
    [categoryId]
  );

  return rows;
}

async function getSortedCases(sort) {
  const order = sort === "oldest"
    ? "ASC"
    : "DESC";

  const [rows] = await pool.query(`
    SELECT *
    FROM scam_cases
    ORDER BY created_at ${order}
  `);

  return rows;
}

async function getCaseById(id) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM scam_cases
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
}

async function addVote(caseId) {
  await pool.query(
    `
    INSERT INTO votes (case_id)
    VALUES (?)
    `,
    [caseId]
  );
}

async function addFlag(caseId) {
  await pool.query(
    `
    INSERT INTO flags (case_id)
    VALUES (?)
    `,
    [caseId]
  );
}

module.exports = {
  getAllCases,
  searchCases,
  getCasesByCategory,
  getSortedCases,
  getCaseById,
  addVote,
  addFlag
};