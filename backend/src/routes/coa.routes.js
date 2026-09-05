// backend/src/routes/coa.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const { isValidAccountType, isValidId, VALID_ACCOUNT_TYPES } = require('../middleware/validation');

const router = express.Router();
router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /coa - list all chart of accounts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type FROM accounts ORDER BY id ASC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch accounts' } });
  }
});

// POST /coa - create account
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Account name is required' } });
  }

  if (!type || !isValidAccountType(type)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: `Type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}` }
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO accounts (name, type) VALUES ($1, $2) RETURNING id, name, type',
      [name.trim(), type.toLowerCase()]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create account' } });
  }
});

// PUT /coa/:id - update account
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid account ID' } });
  }

  const id = parseInt(req.params.id, 10);
  const { name, type } = req.body;

  if (type && !isValidAccountType(type)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: `Type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}` }
    });
  }

  try {
    const existing = await pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found' } });
    }

    const cur = existing.rows[0];
    const updateName = name && typeof name === 'string' ? name.trim() : cur.name;
    const updateType = type ? type.toLowerCase() : cur.type;

    const result = await pool.query(
      'UPDATE accounts SET name = $1, type = $2 WHERE id = $3 RETURNING id, name, type',
      [updateName, updateType, id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update account' } });
  }
});

module.exports = router;
