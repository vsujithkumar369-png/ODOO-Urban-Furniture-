const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const filter = {};
    const data = await prisma.product.findMany({ where: filter });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'products not found');
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const data = await prisma.product.create({ data: req.body });
    res.status(201).json(data);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const data = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
