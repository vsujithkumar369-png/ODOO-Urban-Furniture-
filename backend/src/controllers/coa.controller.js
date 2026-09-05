const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const data = await prisma.chartOfAccount.findMany();
    return ok(res, data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.chartOfAccount.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Account not found');
    return ok(res, data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name and type are required');
    const data = await prisma.chartOfAccount.create({ data: { name, type } });
    return ok(res, data, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    const data = await prisma.chartOfAccount.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type }
    });
    return ok(res, data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
