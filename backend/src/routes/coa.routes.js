// backend/src/routes/coa.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /coa
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type FROM accounts ORDER BY id ASC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch accounts' } });
  }
});

// POST /coa
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name and type are required' } });
  }

  const validTypes = ['asset', 'liability', 'capital', 'income', 'expense'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Type must be one of: ${validTypes.join(', ')}` } });
  }

  try {
    const result = await pool.query(
      'INSERT INTO accounts (name, type) VALUES ($1, $2) RETURNING id, name, type',
      [name, type]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create account' } });
  }
});

// PUT /coa/:id
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found' } });
    }

    const cur = existing.rows[0];
    const result = await pool.query(
      'UPDATE accounts SET name = $1, type = $2 WHERE id = $3 RETURNING id, name, type',
      [name || cur.name, type || cur.type, id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update account' } });
  }
});

module.exports = router;
