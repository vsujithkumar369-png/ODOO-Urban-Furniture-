const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { errorResponse, ok } = require('../utils/errors');
const { JWT_SECRET } = require('../middleware/auth');

const signup = async (req, res, next) => {
  try {
    const { name, login_id, email, password } = req.body;

    if (!name || !login_id || !email || !password) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, login_id, email and password are required');
    }

    const existingRes = await pool.query(
      'SELECT id FROM users WHERE LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [login_id, email]
    );

    if (existingRes.rows.length > 0) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Login ID or Email already exists');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const insertRes = await pool.query(
      `INSERT INTO users (name, login_id, email, password, role)
       VALUES ($1, $2, $3, $4, 'accountant')
       RETURNING id, name, login_id, email, role`,
      [name.trim(), login_id, email, password_hash]
    );

    const user = insertRes.rows[0];
    return ok(res, { id: user.id, name: user.name, login_id: user.login_id, email: user.email, role: user.role }, 201);
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { login_id, password } = req.body;

    if (!login_id || !password) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'login_id and password are required');
    }

    const userRes = await pool.query(
      'SELECT * FROM users WHERE LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($1)',
      [login_id]
    );

    if (userRes.rows.length === 0) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid Login Id or Password');
    }

    const user = userRes.rows[0];

    let isMatch = false;
    const storedPwd = user.password || user.password_hash || '';
    if (storedPwd.startsWith('$2b$') || storedPwd.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(password, storedPwd);
    } else {
      isMatch = (storedPwd === password);
    }

    if (!isMatch) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid Login Id or Password');
    }

    let contactType = null;
    if (user.contact_id) {
      const cRes = await pool.query('SELECT type FROM contacts WHERE id = $1', [user.contact_id]);
      if (cRes.rows.length > 0) contactType = cRes.rows[0].type ? cRes.rows[0].type.toUpperCase() : null;
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      login_id: user.login_id,
      email: user.email,
      role: user.role,
      contact_id: user.contact_id,
      contact_type: contactType
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    return ok(res, { token, user: tokenPayload });
  } catch (error) { next(error); }
};

module.exports = { signup, login };

