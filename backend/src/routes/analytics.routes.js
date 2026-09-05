// backend/src/routes/analytics.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// Helper function to format analytic account response
function formatAnalyticAccount(a) {
  return {
    id: a.id,
    name: a.name,
    type: (a.type || 'EXPENSE').toUpperCase(),
    created_at: a.created_at
  };
}

// GET /api/analytics
router.get('/', async (req, res) => {
  const { type, search } = req.query;
  try {
    let query = 'SELECT * FROM analytic_accounts WHERE 1=1';
    const params = [];

    if (type) {
      const upperType = type.toUpperCase();
      if (!['INCOME', 'EXPENSE'].includes(upperType)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Type filter must be INCOME or EXPENSE' } });
      }
      params.push(upperType);
      query += ` AND UPPER(type) = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json({ data: result.rows.map(formatAnalyticAccount) });
  } catch (err) {
    console.error('Error fetching analytic accounts:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch analytic accounts' } });
  }
});

// GET /api/analytics/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid analytic account ID' } });
  }

  try {
    const result = await pool.query('SELECT * FROM analytic_accounts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analytic account not found' } });
    }
    res.json({ data: formatAnalyticAccount(result.rows[0]) });
  } catch (err) {
    console.error('Error fetching analytic account by ID:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch analytic account' } });
  }
});

// POST /api/analytics (Admin & Accountant)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type = 'EXPENSE' } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account name is required' } });
  }

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account type is required' } });
  }

  const normalizedType = type.toUpperCase();
  if (!['INCOME', 'EXPENSE'].includes(normalizedType)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account type must be INCOME or EXPENSE' } });
  }

  try {
    // Application-level duplicate check
    const existing = await pool.query('SELECT id FROM analytic_accounts WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account with this name already exists' } });
    }

    const result = await pool.query(
      'INSERT INTO analytic_accounts (name, type) VALUES ($1, $2) RETURNING *',
      [name.trim(), normalizedType]
    );

    res.status(201).json({ data: formatAnalyticAccount(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL Unique Violation
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account with this name already exists' } });
    }
    console.error('Error creating analytic account:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create analytic account' } });
  }
});

// PUT /api/analytics/:id (Admin & Accountant)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid analytic account ID' } });
  }

  const { name, type } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM analytic_accounts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analytic account not found' } });
    }

    const cur = existing.rows[0];

    let newName = cur.name;
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account name cannot be empty' } });
      }
      newName = name.trim();
      if (newName.toLowerCase() !== cur.name.toLowerCase()) {
        const nameCheck = await pool.query('SELECT id FROM analytic_accounts WHERE LOWER(name) = LOWER($1) AND id != $2', [newName, id]);
        if (nameCheck.rows.length > 0) {
          return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account with this name already exists' } });
        }
      }
    }

    let newType = cur.type;
    if (type !== undefined) {
      if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account type cannot be empty' } });
      }
      const normalizedType = type.toUpperCase();
      if (!['INCOME', 'EXPENSE'].includes(normalizedType)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account type must be INCOME or EXPENSE' } });
      }
      newType = normalizedType;
    }

    const result = await pool.query(
      'UPDATE analytic_accounts SET name = $1, type = $2 WHERE id = $3 RETURNING *',
      [newName, newType, id]
    );

    res.json({ data: formatAnalyticAccount(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Analytic account with this name already exists' } });
    }
    console.error('Error updating analytic account:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update analytic account' } });
  }
});

// DELETE /api/analytics/:id (Admin & Accountant - safe reference check)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid analytic account ID' } });
  }

  try {
    const existing = await pool.query('SELECT * FROM analytic_accounts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analytic account not found' } });
    }

    // Check if referenced in budgets or document_lines before deleting
    const budgetRef = await pool.query('SELECT id FROM budgets WHERE analytic_account_id = $1 LIMIT 1', [id]);
    if (budgetRef.rows.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Cannot delete analytic account because it is referenced in Budgets.' }
      });
    }

    const docLineRef = await pool.query('SELECT id FROM document_lines WHERE analytic_account_id = $1 LIMIT 1', [id]);
    if (docLineRef.rows.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Cannot delete analytic account because it is referenced in transaction document lines.' }
      });
    }

    await pool.query('DELETE FROM analytic_accounts WHERE id = $1', [id]);
    res.json({ data: { message: 'Analytic account deleted successfully', id } });
  } catch (err) {
    console.error('Error deleting analytic account:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete analytic account' } });
  }
});

module.exports = router;
