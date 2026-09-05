const { pool } = require('../db');
const { errorResponse, ok } = require('../utils/errors');

const getJournals = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT j.*, a.name AS default_account_name 
       FROM journals j
       LEFT JOIN accounts a ON j.default_account_id = a.id
       ORDER BY j.id ASC`
    );
    return ok(res, result.rows);
  } catch (error) { next(error); }
};

const getJournalById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT j.*, a.name AS default_account_name 
       FROM journals j
       LEFT JOIN accounts a ON j.default_account_id = a.id
       WHERE j.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Journal not found');
    return ok(res, result.rows[0]);
  } catch (error) { next(error); }
};

const createJournal = async (req, res, next) => {
  try {
    const { name, type, default_account_id } = req.body;
    if (!name || !type || !default_account_id) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, type and default_account_id are required');
    }

    // Lookup default account name
    const accRes = await pool.query('SELECT name FROM accounts WHERE id = $1', [default_account_id]);
    const defaultAccountName = accRes.rows.length > 0 ? accRes.rows[0].name : null;

    const result = await pool.query(
      `INSERT INTO journals (name, type, default_account_id, default_account_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, type, default_account_id, defaultAccountName]
    );
    return ok(res, result.rows[0], 201);
  } catch (error) { next(error); }
};

const updateJournal = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type, default_account_id } = req.body;

    let defaultAccountName = null;
    if (default_account_id) {
      const accRes = await pool.query('SELECT name FROM accounts WHERE id = $1', [default_account_id]);
      if (accRes.rows.length > 0) defaultAccountName = accRes.rows[0].name;
    }

    const result = await pool.query(
      `UPDATE journals
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           default_account_id = COALESCE($3, default_account_id),
           default_account_name = COALESCE($4, default_account_name)
       WHERE id = $5
       RETURNING *`,
      [name, type, default_account_id, defaultAccountName, id]
    );
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Journal not found');
    return ok(res, result.rows[0]);
  } catch (error) { next(error); }
};

const deleteJournal = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const delRes = await pool.query('DELETE FROM journals WHERE id = $1 RETURNING id', [id]);
    if (delRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Journal not found');
    return ok(res, { id, deleted: true });
  } catch (error) { next(error); }
};

module.exports = {
  getJournals,
  getJournalById,
  createJournal,
  updateJournal,
  deleteJournal
};

