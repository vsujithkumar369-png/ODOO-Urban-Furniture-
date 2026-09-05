// backend/src/routes/analytics.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /analytics
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type FROM analytic_accounts ORDER BY id ASC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch analytic accounts' } });
  }
});

// POST /analytics
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, type = 'expense' } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
  }

  try {
    const result = await pool.query(
      'INSERT INTO analytic_accounts (name, type) VALUES ($1, $2) RETURNING id, name, type',
      [name, type]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create analytic account' } });
  }
});

// PUT /analytics/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM analytic_accounts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analytic account not found' } });
    }

    const cur = existing.rows[0];
    const result = await pool.query(
      'UPDATE analytic_accounts SET name = $1, type = $2 WHERE id = $3 RETURNING id, name, type',
      [name || cur.name, type || cur.type, id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update analytic account' } });
  }
});

module.exports = router;
