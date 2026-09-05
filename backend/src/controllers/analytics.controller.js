const { pool } = require('../db');
const { errorResponse, ok } = require('../utils/errors');

const getAnalyticAccounts = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM analytic_accounts ORDER BY id ASC');
    return ok(res, result.rows);
  } catch (error) { next(error); }
};

const getAnalyticAccountById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM analytic_accounts WHERE id = $1', [id]);
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Analytic Account not found');
    return ok(res, result.rows[0]);
  } catch (error) { next(error); }
};

const createAnalyticAccount = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name and type are required');
    const result = await pool.query(
      `INSERT INTO analytic_accounts (name, type) VALUES ($1, $2) RETURNING *`,
      [name, type]
    );
    return ok(res, result.rows[0], 201);
  } catch (error) { next(error); }
};

const updateAnalyticAccount = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type } = req.body;
    const result = await pool.query(
      `UPDATE analytic_accounts SET name = COALESCE($1, name), type = COALESCE($2, type) WHERE id = $3 RETURNING *`,
      [name, type, id]
    );
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Analytic Account not found');
    return ok(res, result.rows[0]);
  } catch (error) { next(error); }
};

const deleteAnalyticAccount = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const delRes = await pool.query('DELETE FROM analytic_accounts WHERE id = $1 RETURNING id', [id]);
    if (delRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Analytic Account not found');
    return ok(res, { id, deleted: true });
  } catch (error) { next(error); }
};

module.exports = {
  getAnalyticAccounts,
  getAnalyticAccountById,
  createAnalyticAccount,
  updateAnalyticAccount,
  deleteAnalyticAccount
};

