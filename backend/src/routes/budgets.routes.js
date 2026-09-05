// backend/src/routes/budgets.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

async function computeBudgetFields(budget) {
  const committed = parseFloat(budget.committed_amount) || 0;
  if (budget.status !== 'confirmed') {
    return {
      ...budget,
      committed_amount: committed,
      achieved_amount: 0,
      achieved_percent: 0,
      amount_to_achieve: committed
    };
  }

  // Calculate achieved amount from confirmed/paid documents in PostgreSQL
  const docType = budget.type === 'expense' ? 'VENDOR_BILL' : 'CUSTOMER_INVOICE';
  const query = `
    SELECT COALESCE(SUM(dl.line_total), 0) as achieved
    FROM document_lines dl
    JOIN documents d ON dl.document_id = d.id
    WHERE d.status IN ('confirmed', 'paid', 'partially_paid')
      AND d.doc_type = $1
      AND dl.analytic_account_id = $2
  `;
  const res = await pool.query(query, [docType, budget.analytic_account_id]);
  const achieved = parseFloat(res.rows[0].achieved) || 0;
  const pct = committed > 0 ? parseFloat(((achieved / committed) * 100).toFixed(1)) : 0;
  const remaining = Math.max(0, committed - achieved);

  return {
    ...budget,
    committed_amount: committed,
    achieved_amount: achieved,
    achieved_percent: pct,
    amount_to_achieve: remaining
  };
}

// GET /budgets
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM budgets ORDER BY id ASC');
    const budgetsWithComputed = await Promise.all(result.rows.map(computeBudgetFields));
    res.json({ data: budgetsWithComputed });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch budgets' } });
  }
});

// GET /budgets/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }
    const computed = await computeBudgetFields(result.rows[0]);
    res.json({ data: computed });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch budget' } });
  }
});

// GET /budgets/:id/achieved-documents
router.get('/:id/achieved-documents', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const budgetRes = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    if (budgetRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }
    const budget = budgetRes.rows[0];

    const docType = budget.type === 'expense' ? 'VENDOR_BILL' : 'CUSTOMER_INVOICE';
    const query = `
      SELECT d.id as document_id, d.number, SUM(dl.line_total) as amount, d.doc_type
      FROM document_lines dl
      JOIN documents d ON dl.document_id = d.id
      WHERE d.status IN ('confirmed', 'paid', 'partially_paid')
        AND d.doc_type = $1
        AND dl.analytic_account_id = $2
      GROUP BY d.id, d.number, d.doc_type
    `;
    const docsRes = await pool.query(query, [docType, budget.analytic_account_id]);
    const docs = docsRes.rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount) || 0
    }));
    res.json({ data: docs });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch achieved documents' } });
  }
});

// POST /budgets
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, start_date, end_date, analytic_account_id, type = 'expense', responsible, committed_amount } = req.body;
  if (!name || !start_date || !end_date || !analytic_account_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required budget fields' } });
  }

  try {
    const analyticRes = await pool.query('SELECT name FROM analytic_accounts WHERE id = $1', [parseInt(analytic_account_id)]);
    const analyticName = analyticRes.rows.length > 0 ? analyticRes.rows[0].name : '';

    const insertRes = await pool.query(
      `INSERT INTO budgets (name, start_date, end_date, analytic_account_id, analytic_account_name, type, responsible, committed_amount, status, revision_of_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name,
        start_date,
        end_date,
        parseInt(analytic_account_id),
        analyticName,
        type,
        responsible || req.user.name,
        parseFloat(committed_amount) || 0,
        'draft',
        null
      ]
    );

    const computed = await computeBudgetFields(insertRes.rows[0]);
    res.status(201).json({ data: computed });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create budget' } });
  }
});

// PUT /budgets/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, start_date, end_date, analytic_account_id, type, responsible, committed_amount } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }

    const cur = existing.rows[0];
    let analyticName = cur.analytic_account_name;
    let parsedAnalyticId = cur.analytic_account_id;

    if (analytic_account_id !== undefined) {
      parsedAnalyticId = parseInt(analytic_account_id);
      const aRes = await pool.query('SELECT name FROM analytic_accounts WHERE id = $1', [parsedAnalyticId]);
      if (aRes.rows.length > 0) analyticName = aRes.rows[0].name;
    }

    const updateRes = await pool.query(
      `UPDATE budgets SET
        name = $1, start_date = $2, end_date = $3, analytic_account_id = $4, analytic_account_name = $5,
        type = $6, responsible = $7, committed_amount = $8
       WHERE id = $9 RETURNING *`,
      [
        name || cur.name,
        start_date || cur.start_date,
        end_date || cur.end_date,
        parsedAnalyticId,
        analyticName,
        type || cur.type,
        responsible || cur.responsible,
        committed_amount !== undefined ? parseFloat(committed_amount) : cur.committed_amount,
        id
      ]
    );

    const computed = await computeBudgetFields(updateRes.rows[0]);
    res.json({ data: computed });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update budget' } });
  }
});

// POST /budgets/:id/confirm
router.post('/:id/confirm', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const updateRes = await pool.query(
      "UPDATE budgets SET status = 'confirmed' WHERE id = $1 RETURNING *",
      [id]
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }
    const computed = await computeBudgetFields(updateRes.rows[0]);
    res.json({ data: computed });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to confirm budget' } });
  }
});

// POST /budgets/:id/revise
router.post('/:id/revise', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const budgetRes = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    if (budgetRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }
    const b = budgetRes.rows[0];

    const insertRes = await pool.query(
      `INSERT INTO budgets (name, start_date, end_date, analytic_account_id, analytic_account_name, type, responsible, committed_amount, status, revision_of_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        `${b.name} (Rev)`,
        b.start_date,
        b.end_date,
        b.analytic_account_id,
        b.analytic_account_name,
        b.type,
        b.responsible,
        b.committed_amount,
        'draft',
        b.id
      ]
    );

    const computed = await computeBudgetFields(insertRes.rows[0]);
    res.status(201).json({ data: computed });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to revise budget' } });
  }
});

module.exports = router;
