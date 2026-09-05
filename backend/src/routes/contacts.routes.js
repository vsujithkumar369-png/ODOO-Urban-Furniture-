// backend/src/routes/contacts.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const { isValidEmail, isValidPhone } = require('../middleware/validation');

const router = express.Router();

// All contact routes require authentication
router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/contacts
router.get('/', async (req, res) => {
  const { type } = req.query;
  try {
    let query = 'SELECT * FROM contacts';
    const params = [];
    if (type) {
      const lowerType = type.toLowerCase();
      if (!['customer', 'vendor', 'both'].includes(lowerType)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Type filter must be customer, vendor, or both' } });
      }
      query += ' WHERE LOWER(type) = $1 OR LOWER(type) = $2';
      params.push(lowerType, 'both');
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch contacts' } });
  }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid contact ID' } });
  }
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

// POST /api/contacts (Admin & Accountant)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type = 'CUSTOMER', email, mobile, phone, street, city, state, country, pincode, image_url, profile_image } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contact name is required' } });
  }

  const normalizedType = (type || 'CUSTOMER').toUpperCase();
  if (!['CUSTOMER', 'VENDOR', 'BOTH'].includes(normalizedType)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Type must be CUSTOMER, VENDOR, or BOTH' } });
  }

  const contactEmail = email ? email.trim() : null;
  if (contactEmail && !isValidEmail(contactEmail)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } });
  }

  const contactPhone = mobile || phone || '';
  if (contactPhone && !isValidPhone(contactPhone)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid phone/mobile number format' } });
  }

  const imageUrl = image_url || profile_image || null;

  try {
    // Check duplicate email
    if (contactEmail) {
      const existing = await pool.query('SELECT id FROM contacts WHERE LOWER(email) = LOWER($1)', [contactEmail]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contact with this email already exists' } });
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO contacts (name, type, email, mobile, street, city, state, country, pincode, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name.trim(), normalizedType, contactEmail, contactPhone, street || '', city || '', state || '', country || '', pincode || '', imageUrl]
    );
    const newContact = insertRes.rows[0];

    let createdUser = null;
    let tempPassword = null;

    // Auto-create portal user if email provided and user not linked
    if (contactEmail) {
      const userCheck = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR contact_id = $2', [contactEmail, newContact.id]);
      if (userCheck.rows.length === 0) {
        tempPassword = req.body.portal_password || 'portal123';
        const hashedPass = await bcrypt.hash(tempPassword, 12);
        const safeBase = contactEmail.includes('@') ? contactEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') : `user_${newContact.id}`;
        const loginId = safeBase.length < 6 ? `${safeBase}_${newContact.id}`.slice(0, 12) : safeBase.slice(0, 12);

        const userRes = await pool.query(
          `INSERT INTO users (name, login_id, email, password, role, contact_id)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, login_id, email, role, contact_id`,
          [name.trim(), loginId, contactEmail, hashedPass, ROLES.CONTACT, newContact.id]
        );
        createdUser = userRes.rows[0];
      }
    }

    res.status(201).json({
      data: {
        ...newContact,
        portal_user: createdUser ? { ...createdUser, temporary_password: tempPassword } : null
      }
    });
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL Unique Constraint Violation
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contact with this email already exists' } });
    }
    console.error('Error creating contact:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create contact' } });
  }
});

// PUT /api/contacts/:id (Admin & Accountant)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid contact ID' } });
  }

  const { name, type, email, mobile, phone, street, city, state, country, pincode, image_url, profile_image } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    const cur = existing.rows[0];

    let newType = cur.type;
    if (type !== undefined) {
      const normalizedType = type.toUpperCase();
      if (!['CUSTOMER', 'VENDOR', 'BOTH'].includes(normalizedType)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Type must be CUSTOMER, VENDOR, or BOTH' } });
      }
      newType = normalizedType.toLowerCase();
    }

    let newEmail = cur.email;
    if (email !== undefined) {
      const trimmedEmail = email ? email.trim() : null;
      if (trimmedEmail && !isValidEmail(trimmedEmail)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } });
      }
      if (trimmedEmail && trimmedEmail.toLowerCase() !== (cur.email || '').toLowerCase()) {
        const emailCheck = await pool.query('SELECT id FROM contacts WHERE LOWER(email) = LOWER($1) AND id != $2', [trimmedEmail, id]);
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contact with this email already exists' } });
        }
      }
      newEmail = trimmedEmail;
    }

    const contactPhone = mobile !== undefined ? mobile : (phone !== undefined ? phone : cur.mobile);
    if (contactPhone && !isValidPhone(contactPhone)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid phone/mobile number format' } });
    }

    const imageUrl = image_url !== undefined ? image_url : (profile_image !== undefined ? profile_image : cur.image_url);

    const updated = await pool.query(
      `UPDATE contacts SET
        name = $1, type = $2, email = $3, mobile = $4, street = $5, city = $6, state = $7, country = $8, pincode = $9, image_url = $10
       WHERE id = $11 RETURNING *`,
      [
        name !== undefined ? name.trim() : cur.name,
        newType,
        newEmail,
        contactPhone,
        street !== undefined ? street : cur.street,
        city !== undefined ? city : cur.city,
        state !== undefined ? state : cur.state,
        country !== undefined ? country : cur.country,
        pincode !== undefined ? pincode : cur.pincode,
        imageUrl,
        id
      ]
    );

    // Keep existing portal user linked if email updated
    if (newEmail && newEmail !== cur.email) {
      await pool.query('UPDATE users SET email = $1 WHERE contact_id = $2', [newEmail, id]);
    }

    res.json({ data: updated.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contact with this email already exists' } });
    }
    console.error('Error updating contact:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update contact' } });
  }
});

// DELETE /api/contacts/:id (Admin & Accountant - safe foreign key check)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid contact ID' } });
  }

  try {
    const existing = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    // Check if referenced in documents or payments before deletion
    const docCheck = await pool.query('SELECT id FROM documents WHERE contact_id = $1 LIMIT 1', [id]);
    if (docCheck.rows.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Cannot delete contact because it is referenced in documents (invoices/bills/orders).' }
      });
    }

    // Remove linked portal user non-destructively or unlink
    await pool.query('DELETE FROM users WHERE contact_id = $1', [id]);
    await pool.query('DELETE FROM contacts WHERE id = $1', [id]);

    res.json({ data: { message: 'Contact deleted successfully', id } });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete contact' } });
  }
});

module.exports = router;
