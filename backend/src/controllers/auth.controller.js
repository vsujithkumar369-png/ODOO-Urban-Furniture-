const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { errorResponse, ok } = require('../utils/errors');

const prisma = new PrismaClient();

const signup = async (req, res, next) => {
  try {
    const { name, login_id, email, password } = req.body;

    if (!name || !login_id || !email || !password) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, login_id, email and password are required');
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ login_id }, { email }] }
    });

    if (existingUser) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Login ID or Email already exists');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, login_id, email, password_hash, role: 'admin' }
    });

    return ok(res, { id: user.id, name: user.name, login_id: user.login_id, email: user.email, role: user.role }, 201);
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { login_id, password } = req.body;

    if (!login_id || !password) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'login_id and password are required');
    }

    const user = await prisma.user.findUnique({ where: { login_id } });

    if (!user) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid Login Id or Password');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid Login Id or Password');
    }

    const tokenPayload = { id: user.id, name: user.name, role: user.role, contact_id: user.contact_id };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    return ok(res, { token, user: tokenPayload });
  } catch (error) { next(error); }
};

module.exports = { signup, login };
