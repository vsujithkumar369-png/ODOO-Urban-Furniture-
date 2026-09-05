// backend/src/routes/contacts.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /contacts
router.get('/', async (req, res) => {
  const { type } = req.query;
  try {
    let query = 'SELECT * FROM contacts';
    const params = [];
    if (type) {
      query += ' WHERE type = $1 OR type = $2';
      params.push(type, 'both');
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch contacts' } });
  }
});

// GET /contacts/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch contact' } });
  }
});

// POST /contacts
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, type = 'customer', email = '', mobile = '', city = '', state = '', pincode = '', image_url = null } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contact name is required' } });
  }

  try {
    const insertRes = await pool.query(
      `INSERT INTO contacts (name, type, email, mobile, city, state, pincode, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, type, email, mobile, city, state, pincode, image_url]
    );
    const newContact = insertRes.rows[0];

    // Auto-create portal user if email provided
    if (email) {
      const userCheck = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (userCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (name, login_id, email, password, role, contact_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [name, email, email, 'portal123', 'contact', newContact.id]
        );
      }
    }

    res.status(201).json({ data: newContact });
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create contact' } });
  }
});

// PUT /contacts/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type, email, mobile, city, state, pincode, image_url } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    const cur = existing.rows[0];
    const updated = await pool.query(
      `UPDATE contacts SET
        name = $1, type = $2, email = $3, mobile = $4, city = $5, state = $6, pincode = $7, image_url = $8
       WHERE id = $9 RETURNING *`,
      [
        name !== undefined ? name : cur.name,
        type !== undefined ? type : cur.type,
        email !== undefined ? email : cur.email,
        mobile !== undefined ? mobile : cur.mobile,
        city !== undefined ? city : cur.city,
        state !== undefined ? state : cur.state,
        pincode !== undefined ? pincode : cur.pincode,
        image_url !== undefined ? image_url : cur.image_url,
        id
      ]
    );

    res.json({ data: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update contact' } });
  }
});

module.exports = router;
