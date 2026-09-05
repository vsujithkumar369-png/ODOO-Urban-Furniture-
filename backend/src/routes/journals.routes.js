// backend/src/routes/journals.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const { isValidJournalType, isValidId, VALID_JOURNAL_TYPES } = require('../middleware/validation');

const router = express.Router();
router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /journals - list all journals
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, type, default_account_id, default_account_name FROM journals ORDER BY id ASC'
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching journals:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch journals' } });
  }
});

// POST /journals - create journal
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type, default_account_id } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Journal name is required' } });
  }

  if (!type || !isValidJournalType(type)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: `Journal type must be one of: ${VALID_JOURNAL_TYPES.join(', ')}` }
    });
  }

  try {
    let defaultAccName = null;
    let accId = null;
    if (default_account_id) {
      accId = parseInt(default_account_id, 10);
      const accRes = await pool.query('SELECT name FROM accounts WHERE id = $1', [accId]);
      if (accRes.rows.length > 0) {
        defaultAccName = accRes.rows[0].name;
      }
    }

    const result = await pool.query(
      `INSERT INTO journals (name, type, default_account_id, default_account_name)
       VALUES ($1, $2, $3, $4) RETURNING id, name, type, default_account_id, default_account_name`,
      [name.trim(), type.toLowerCase(), accId, defaultAccName]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating journal:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create journal' } });
  }
});

// PUT /journals/:id - update journal
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid journal ID' } });
  }

  const id = parseInt(req.params.id, 10);
  const { name, type, default_account_id } = req.body;

  if (type && !isValidJournalType(type)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: `Journal type must be one of: ${VALID_JOURNAL_TYPES.join(', ')}` }
    });
  }

  try {
    const existing = await pool.query('SELECT * FROM journals WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journal not found' } });
    }

    const cur = existing.rows[0];
    let defaultAccName = cur.default_account_name;
    let accId = cur.default_account_id;

    if (default_account_id !== undefined) {
      accId = default_account_id ? parseInt(default_account_id, 10) : null;
      if (accId) {
        const accRes = await pool.query('SELECT name FROM accounts WHERE id = $1', [accId]);
        defaultAccName = accRes.rows.length > 0 ? accRes.rows[0].name : null;
      } else {
        defaultAccName = null;
      }
    }

    const updateName = name && typeof name === 'string' ? name.trim() : cur.name;
    const updateType = type ? type.toLowerCase() : cur.type;

    const result = await pool.query(
      `UPDATE journals SET
        name = $1, type = $2, default_account_id = $3, default_account_name = $4
       WHERE id = $5 RETURNING id, name, type, default_account_id, default_account_name`,
      [updateName, updateType, accId, defaultAccName, id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error updating journal:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update journal' } });
  }
});

module.exports = router;
