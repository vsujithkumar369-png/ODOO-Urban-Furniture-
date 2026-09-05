const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) { filter.type = req.query.type; }
    const data = await prisma.contact.findMany({ where: filter });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.contact.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'contacts not found');
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const data = await prisma.contact.create({ data: req.body });
    res.status(201).json(data);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const data = await prisma.contact.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
