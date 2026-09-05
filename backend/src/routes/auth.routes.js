// backend/src/routes/auth.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const store = require('../store');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', (req, res) => {
  const { name, login_id, email, password } = req.body;

  if (!name || !login_id || !email || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'All fields are required' }
    });
  }

  const existing = store.users.find(
    u => u.login_id.toLowerCase() === login_id.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Login ID or Email already exists' }
    });
  }

  const newUser = {
    id: store.counters.user++,
    name,
    login_id,
    email,
    password,
    role: 'admin',
    contact_id: null
  };

  store.users.push(newUser);

  res.status(201).json({
    data: {
      id: newUser.id,
      name: newUser.name,
      login_id: newUser.login_id,
      email: newUser.email,
      role: newUser.role
    }
  });
});

router.post('/login', (req, res) => {
  const { login_id, password } = req.body;

  if (!login_id || !password) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid Login Id or Password' }
    });
  }

  const user = store.users.find(
    u => (u.login_id.toLowerCase() === login_id.toLowerCase() || u.email.toLowerCase() === login_id.toLowerCase()) && u.password === password
  );

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
});

module.exports = router;
