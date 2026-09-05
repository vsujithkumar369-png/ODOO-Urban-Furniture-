const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

const include = { default_account: true };

const getAll = async (req, res, next) => {
  try {
    const data = await prisma.journal.findMany({ include });
    const shaped = data.map(j => ({ ...j, default_account_name: j.default_account?.name }));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.journal.findUnique({ where: { id: parseInt(req.params.id) }, include });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Journal not found');
    return ok(res, { ...data, default_account_name: data.default_account?.name });
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type, default_account_id } = req.body;
    if (!name || !type || !default_account_id) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, type and default_account_id are required');
    const data = await prisma.journal.create({ data: { name, type, default_account_id }, include });
    return ok(res, { ...data, default_account_name: data.default_account?.name }, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type, default_account_id } = req.body;
    const data = await prisma.journal.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type, default_account_id },
      include
    });
    return ok(res, { ...data, default_account_name: data.default_account?.name });
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
