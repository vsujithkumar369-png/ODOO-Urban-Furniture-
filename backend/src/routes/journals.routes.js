// backend/src/routes/journals.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /journals
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type, default_account_id, default_account_name FROM journals ORDER BY id ASC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch journals' } });
  }
});

// POST /journals
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type, default_account_id } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name and type are required' } });
  }

  try {
    let defaultAccName = null;
    let accId = null;
    if (default_account_id) {
      accId = parseInt(default_account_id);
      const accRes = await pool.query('SELECT name FROM accounts WHERE id = $1', [accId]);
      if (accRes.rows.length > 0) {
        defaultAccName = accRes.rows[0].name;
      }
    }

    const result = await pool.query(
      `INSERT INTO journals (name, type, default_account_id, default_account_name)
       VALUES ($1, $2, $3, $4) RETURNING id, name, type, default_account_id, default_account_name`,
      [name, type, accId, defaultAccName]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create journal' } });
  }
});

// PUT /journals/:id
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type, default_account_id } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM journals WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journal not found' } });
    }

    const cur = existing.rows[0];
    let defaultAccName = cur.default_account_name;
    let accId = cur.default_account_id;

    if (default_account_id !== undefined) {
      accId = parseInt(default_account_id) || null;
      if (accId) {
        const accRes = await pool.query('SELECT name FROM accounts WHERE id = $1', [accId]);
        defaultAccName = accRes.rows.length > 0 ? accRes.rows[0].name : null;
      } else {
        defaultAccName = null;
      }
    }

    const result = await pool.query(
      `UPDATE journals SET
        name = $1, type = $2, default_account_id = $3, default_account_name = $4
       WHERE id = $5 RETURNING id, name, type, default_account_id, default_account_name`,
      [name || cur.name, type || cur.type, accId, defaultAccName, id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update journal' } });
  }
});

module.exports = router;
