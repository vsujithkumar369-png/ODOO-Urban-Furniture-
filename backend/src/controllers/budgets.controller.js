const { pool } = require('../db');
const { errorResponse, ok } = require('../utils/errors');

async function computeAchieved(budget) {
  const res = await pool.query(
    `SELECT dl.line_total
     FROM document_lines dl
     JOIN documents d ON dl.document_id = d.id
     WHERE dl.analytic_account_id = $1
       AND LOWER(d.status) IN ('confirmed', 'paid')
       AND d.doc_date >= $2 AND d.doc_date <= $3`,
    [budget.analytic_account_id, String(budget.start_date), String(budget.end_date)]
  );

  const achieved_amount = res.rows.reduce((sum, l) => sum + parseFloat(l.line_total), 0);
  const committed = parseFloat(budget.committed_amount || 0);
  const achieved_percent = committed > 0 ? (achieved_amount / committed) * 100 : 0;
  const amount_to_achieve = Math.max(committed - achieved_amount, 0);

  return { achieved_amount, achieved_percent, amount_to_achieve };
}

async function shapeBudget(b) {
  const computed = await computeAchieved(b);
  let analyticName = b.analytic_account_name;
  let type = b.type;

  if (!analyticName || !type) {
    const aRes = await pool.query('SELECT name, type FROM analytic_accounts WHERE id = $1', [b.analytic_account_id]);
    if (aRes.rows.length > 0) {
      analyticName = aRes.rows[0].name;
      type = aRes.rows[0].type;
    }
  }

  return {
    ...b,
    committed_amount: parseFloat(b.committed_amount),
    analytic_account_name: analyticName,
    type: type,
    ...computed
  };
}

const getBudgets = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM budgets ORDER BY id ASC');
    const shaped = await Promise.all(result.rows.map(shapeBudget));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getBudgetById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');
    return ok(res, await shapeBudget(result.rows[0]));
  } catch (error) { next(error); }
};

const createBudget = async (req, res, next) => {
  try {
    const { name, start_date, end_date, analytic_account_id, committed_amount, revision_of_id, type, responsible } = req.body;
    if (!name || !start_date || !end_date || !analytic_account_id || committed_amount === undefined) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, start_date, end_date, analytic_account_id and committed_amount are required');
    }

    const aRes = await pool.query('SELECT name, type FROM analytic_accounts WHERE id = $1', [analytic_account_id]);
    const analyticName = aRes.rows.length > 0 ? aRes.rows[0].name : null;
    const analyticType = type || (aRes.rows.length > 0 ? aRes.rows[0].type : 'expense');

    const insertRes = await pool.query(
      `INSERT INTO budgets (name, start_date, end_date, analytic_account_id, analytic_account_name, type, responsible, committed_amount, status, revision_of_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
       RETURNING *`,
      [name, String(start_date), String(end_date), analytic_account_id, analyticName, analyticType, responsible || null, committed_amount, revision_of_id || null]
    );

    return ok(res, await shapeBudget(insertRes.rows[0]), 201);
  } catch (error) { next(error); }
};

const updateBudget = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, start_date, end_date, analytic_account_id, committed_amount } = req.body;

    const updateRes = await pool.query(
      `UPDATE budgets
       SET name = COALESCE($1, name),
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           analytic_account_id = COALESCE($4, analytic_account_id),
           committed_amount = COALESCE($5, committed_amount)
       WHERE id = $6
       RETURNING *`,
      [name, start_date ? String(start_date) : null, end_date ? String(end_date) : null, analytic_account_id, committed_amount, id]
    );

    if (updateRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');
    return ok(res, await shapeBudget(updateRes.rows[0]));
  } catch (error) { next(error); }
};

const confirmBudget = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query("UPDATE budgets SET status = 'confirmed' WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');
    return ok(res, await shapeBudget(result.rows[0]));
  } catch (error) { next(error); }
};

const reviseBudget = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query("UPDATE budgets SET status = 'revised' WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');
    return ok(res, await shapeBudget(result.rows[0]));
  } catch (error) { next(error); }
};

const getAchievedDocuments = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const bRes = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    if (bRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');
    const budget = bRes.rows[0];

    const result = await pool.query(
      `SELECT dl.document_id, d.number, dl.line_total AS amount, d.doc_type
       FROM document_lines dl
       JOIN documents d ON dl.document_id = d.id
       WHERE dl.analytic_account_id = $1
         AND LOWER(d.status) IN ('confirmed', 'paid')
         AND d.doc_date >= $2 AND d.doc_date <= $3`,
      [budget.analytic_account_id, String(budget.start_date), String(budget.end_date)]
    );

    const docs = result.rows.map(r => ({
      document_id: r.document_id,
      number: r.number,
      amount: parseFloat(r.amount),
      doc_type: r.doc_type
    }));

    return ok(res, docs);
  } catch (error) { next(error); }
};

module.exports = {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  confirmBudget,
  reviseBudget,
  getAchievedDocuments
};

