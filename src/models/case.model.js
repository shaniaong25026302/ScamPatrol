const { pool } = require("../db");

async function getAllCases() {
  const [rows] = await pool.query(`
    SELECT *
    FROM scam_cases
    ORDER BY created_at DESC
  `);

  return rows;
}

module.exports = {
  getAllCases
};