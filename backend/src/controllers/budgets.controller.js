const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const filter = {};
    const data = await prisma.budget.findMany({ where: filter });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.budget.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'budgets not found');
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const data = await prisma.budget.create({ data: req.body });
    res.status(201).json(data);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const data = await prisma.budget.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const confirm = async (req, res, next) => {
  try {
    const data = await prisma.budget.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'confirmed' }
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const revise = async (req, res, next) => {
  try {
    const data = await prisma.budget.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'revised' }
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update, confirm, revise };
