// backend/src/routes/auth.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { name, login_id, email, password } = req.body;

  if (!name || !login_id || !email || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'All fields are required' }
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

    const insertRes = await pool.query(
      'INSERT INTO users (name, login_id, email, password, role, contact_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, login_id, email, role',
      [name, login_id, email, password, 'admin', null]
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
      'SELECT * FROM users WHERE (LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($1)) AND password = $2',
      [login_id, password]
    );

    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid Login Id or Password' }
      });
    }

    const payload = {
      id: user.id,
      name: user.name,
      role: user.role,
      contact_id: user.contact_id
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          contact_id: user.contact_id
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to login' } });
  }
});

module.exports = router;
