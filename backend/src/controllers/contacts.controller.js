const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { errorResponse, ok } = require('../utils/errors');

const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const data = await prisma.contact.findMany({ where: filter });
    return ok(res, data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.contact.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Contact not found');
    return ok(res, data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type, email, mobile, city, state, pincode, image_url } = req.body;
    if (!name || !type || !email) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, type and email are required');
    }

    const contact = await prisma.contact.create({
      data: { name, type, email, mobile, city, state, pincode, image_url }
    });

    // Auto-create a portal user for this contact
    const tempPassword = Math.random().toString(36).slice(-10) + 'A!1';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.create({
      data: {
        name: contact.name,
        login_id: email,
        email,
        password_hash,
        role: 'contact',
        contact_id: contact.id
      }
    }).catch(() => { /* ignore if login_id collision */ });

    return ok(res, { ...contact, portal_access_created: true }, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type, email, mobile, city, state, pincode, image_url } = req.body;
    const data = await prisma.contact.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type, email, mobile, city, state, pincode, image_url }
    });
    return ok(res, data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
