// <Rebecca Member 2 Start>
// src/models/case.model.js
// Member 2 owns scam case write operations, image storage records, and categories.
// Member 3 can reuse the read helpers for the Community Watch pages.
const { pool } = require("../db");

function toNullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function caseListSelect(whereSql = "", orderSql = "ORDER BY sc.created_at DESC") {
  return `
    SELECT
      sc.*,
      c.name AS category_name,
      (
        SELECT ci.image_path
        FROM case_images ci
        WHERE ci.case_id = sc.id
        ORDER BY ci.id ASC
        LIMIT 1
      ) AS image_path,
      (
        SELECT COUNT(*)
        FROM votes v
        WHERE v.case_id = sc.id
      ) AS helpful_count,
      (
        SELECT COUNT(*)
        FROM flags f
        WHERE f.case_id = sc.id
      ) AS flag_count
    FROM scam_cases sc
    LEFT JOIN categories c ON c.id = sc.category_id
    ${whereSql}
    ${orderSql}
  `;
}

async function getAllCases() {
  const [rows] = await pool.query(caseListSelect());
  return rows;
}

async function searchCases(keyword) {
  const term = `%${keyword}%`;
  const [rows] = await pool.query(
    caseListSelect(`
      WHERE sc.title LIKE ?
         OR sc.description LIKE ?
         OR sc.platform LIKE ?
         OR c.name LIKE ?
    `),
    [term, term, term, term]
  );
  return rows;
}

async function getCasesByCategory(categoryId) {
  const [rows] = await pool.query(
    caseListSelect("WHERE sc.category_id = ?"),
    [categoryId]
  );
  return rows;
}

async function getSortedCases(sort) {
  const order = sort === "oldest" ? "ASC" : "DESC";
  const [rows] = await pool.query(caseListSelect("", `ORDER BY sc.created_at ${order}`));
  return rows;
}

async function getCaseById(id) {
  const [rows] = await pool.query(
    `
      SELECT sc.*, c.name AS category_name
      FROM scam_cases sc
      LEFT JOIN categories c ON c.id = sc.category_id
      WHERE sc.id = ?
      LIMIT 1
    `,
    [id]
  );

  const scam = rows[0];
  if (!scam) return null;

  const [images] = await pool.query(
    `
      SELECT id, image_path
      FROM case_images
      WHERE case_id = ?
      ORDER BY id ASC
    `,
    [id]
  );

  scam.images = images;
  scam.image_path = images[0] ? images[0].image_path : null;
  return scam;
}

async function getCategories() {
  const [rows] = await pool.query(
    `
      SELECT id, name
      FROM categories
      ORDER BY name ASC
    `
  );
  return rows;
}

async function createCase(data, imagePaths = []) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `
        INSERT INTO scam_cases
          (title, description, category_id, platform, scam_date, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        data.title.trim(),
        data.description.trim(),
        toNullable(data.category_id),
        toNullable(data.platform),
        toNullable(data.scam_date),
        toNullable(data.user_id)
      ]
    );

    const caseId = result.insertId;

    for (const imagePath of imagePaths) {
      await conn.query(
        `
          INSERT INTO case_images (case_id, image_path)
          VALUES (?, ?)
        `,
        [caseId, imagePath]
      );
    }

    await conn.commit();
    return getCaseById(caseId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateCase(id, data, imagePaths = []) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      `
        UPDATE scam_cases
        SET title = ?,
            description = ?,
            category_id = ?,
            platform = ?,
            scam_date = ?
        WHERE id = ?
      `,
      [
        data.title.trim(),
        data.description.trim(),
        toNullable(data.category_id),
        toNullable(data.platform),
        toNullable(data.scam_date),
        id
      ]
    );

    if (imagePaths.length > 0) {
      await conn.query("DELETE FROM case_images WHERE case_id = ?", [id]);

      for (const imagePath of imagePaths) {
        await conn.query(
          `
            INSERT INTO case_images (case_id, image_path)
            VALUES (?, ?)
          `,
          [id, imagePath]
        );
      }
    }

    await conn.commit();
    return getCaseById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteCase(id) {
  const [result] = await pool.query("DELETE FROM scam_cases WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

async function addVote(caseId, userId = null) {
  await pool.query(
    `
      INSERT INTO votes (case_id, user_id, vote_type)
      VALUES (?, ?, 'upvote')
    `,
    [caseId, toNullable(userId)]
  );
}

async function addFlag(caseId, userId = null, reason = null) {
  await pool.query(
    `
      INSERT INTO flags (case_id, user_id, reason)
      VALUES (?, ?, ?)
    `,
    [caseId, toNullable(userId), toNullable(reason)]
  );
}

module.exports = {
  getAllCases,
  searchCases,
  getCasesByCategory,
  getSortedCases,
  getCaseById,
  getCategories,
  createCase,
  updateCase,
  deleteCase,
  addVote,
  addFlag
};
// <Rebecca Member 2 End>
