// backend/src/routes/auth.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Helper validation functions
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

router.post('/signup', async (req, res) => {
  // Explicitly ignore role parameter from body to prevent privilege escalation
  const { name, login_id, email, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Name is required' }
    });
  }

  if (!isValidLoginId(login_id)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Login ID must be 6-12 alphanumeric characters' }
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required' }
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: { 
        code: 'VALIDATION_ERROR', 
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and special characters' 
      }
    });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [login_id, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Login ID or Email already exists' }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Rule 1 & 2: Signup ALWAYS creates 'accountant' role, never 'admin'
    const insertRes = await pool.query(
      'INSERT INTO users (name, login_id, email, password, role, contact_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, login_id, email, role',
      [name.trim(), login_id, email, hashedPassword, 'accountant', null]
    );

    const newUser = insertRes.rows[0];

    res.status(201).json({
      data: {
        id: newUser.id,
        name: newUser.name,
        login_id: newUser.login_id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create user' } });
  }
});

router.post('/login', async (req, res) => {
  const { login_id, password } = req.body;

  if (!login_id || !password) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid Login Id or Password' }
    });
  }

  try {
    const userRes = await pool.query(
      'SELECT * FROM users WHERE LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($1)',
      [login_id]
    );

    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid Login Id or Password' }
      });
    }

    // Support existing plaintext or bcrypt hashed passwords during migration seamlessly
    let isMatch = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (user.password === password);
      // Auto-migrate plaintext to bcrypt hash upon successful login
      if (isMatch) {
        const newHash = await bcrypt.hash(password, 12);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid Login Id or Password' }
      });
    }

    let contactType = null;
    if (user.contact_id) {
      const cRes = await pool.query('SELECT type FROM contacts WHERE id = $1', [user.contact_id]);
      if (cRes.rows.length > 0) {
        contactType = cRes.rows[0].type?.toUpperCase() || null;
      }
    }

    const payload = {
      id: user.id,
      name: user.name,
      role: user.role,
      contact_id: user.contact_id,
      contact_type: contactType
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          contact_id: user.contact_id,
          contact_type: contactType
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to login' } });
  }
});

module.exports = router;
