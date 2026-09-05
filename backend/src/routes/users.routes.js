// backend/src/routes/users.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();

function isValidLoginId(loginId) {
  return typeof loginId === 'string' && /^[a-zA-Z0-9_]{6,12}$/.test(loginId);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasUpper && hasLower && hasSpecial;
}

// All user management routes require ADMIN role
router.use(authenticateToken, requireRole(ROLES.ADMIN));

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, login_id, email, role, contact_id, created_at FROM users ORDER BY id ASC'
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to list users' } });
  }
});

// POST /api/users - Admin creates users (Accountant or Contact role)
router.post('/', async (req, res) => {
  const { name, login_id, email, password, role, contact_id } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
  }

  if (!isValidLoginId(login_id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Login ID must be 6-12 alphanumeric characters' } });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required' } });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      error: { 
        code: 'VALIDATION_ERROR', 
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and special characters' 
      } 
    });
  }

  const targetRole = role || ROLES.ACCOUNTANT;
  if (![ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.CONTACT].includes(targetRole)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role specified' } });
  }

  if (targetRole === ROLES.CONTACT && !contact_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'contact_id is required for contact role users' } });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [login_id, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Login ID or Email already exists' } });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const insertRes = await pool.query(
      'INSERT INTO users (name, login_id, email, password, role, contact_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, login_id, email, role, contact_id',
      [name.trim(), login_id, email, hashedPassword, targetRole, contact_id || null]
    );

    res.status(201).json({ data: insertRes.rows[0] });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create user' } });
  }
});

module.exports = router;
