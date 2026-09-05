const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

async function computeAchieved(budget) {
  const lines = await prisma.documentLine.findMany({
    where: {
      analytic_account_id: budget.analytic_account_id,
      document: {
        status: { in: ['confirmed', 'paid'] },
        doc_date: { gte: budget.start_date, lte: budget.end_date }
      }
    }
  });
  const achieved_amount = lines.reduce((s, l) => s + parseFloat(l.line_total), 0);
  const committed = parseFloat(budget.committed_amount);
  const achieved_percent = committed > 0 ? (achieved_amount / committed) * 100 : 0;
  const amount_to_achieve = Math.max(committed - achieved_amount, 0);
  return { achieved_amount, achieved_percent, amount_to_achieve };
}

async function shapeBudget(b) {
  const computed = await computeAchieved(b);
  const analytic = await prisma.analyticAccount.findUnique({ where: { id: b.analytic_account_id } });
  return {
    ...b,
    committed_amount: parseFloat(b.committed_amount),
    analytic_account_name: analytic?.name,
    type: analytic?.type,
    ...computed
  };
}

const getAll = async (req, res, next) => {
  try {
    const budgets = await prisma.budget.findMany();
    const shaped = await Promise.all(budgets.map(shapeBudget));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const b = await prisma.budget.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!b) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, start_date, end_date, analytic_account_id, committed_amount, revision_of_id } = req.body;
    if (!name || !start_date || !end_date || !analytic_account_id || committed_amount === undefined) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, start_date, end_date, analytic_account_id and committed_amount are required');
    }
    const b = await prisma.budget.create({
      data: { name, start_date: new Date(start_date), end_date: new Date(end_date), analytic_account_id, committed_amount, status: 'draft', revision_of_id }
    });
    return ok(res, await shapeBudget(b), 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, start_date, end_date, analytic_account_id, committed_amount } = req.body;
    const b = await prisma.budget.update({
      where: { id: parseInt(req.params.id) },
      data: { name, start_date: start_date ? new Date(start_date) : undefined, end_date: end_date ? new Date(end_date) : undefined, analytic_account_id, committed_amount }
    });
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const confirm = async (req, res, next) => {
  try {
    const b = await prisma.budget.update({ where: { id: parseInt(req.params.id) }, data: { status: 'confirmed' } });
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const revise = async (req, res, next) => {
  try {
    const b = await prisma.budget.update({ where: { id: parseInt(req.params.id) }, data: { status: 'revised' } });
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const achievedDocuments = async (req, res, next) => {
  try {
    const budget = await prisma.budget.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!budget) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');

    const lines = await prisma.documentLine.findMany({
      where: {
        analytic_account_id: budget.analytic_account_id,
        document: {
          status: { in: ['confirmed', 'paid'] },
          doc_date: { gte: budget.start_date, lte: budget.end_date }
        }
      },
      include: { document: true }
    });

    const docs = lines.map(l => ({
      document_id: l.document_id,
      number: l.document.number,
      amount: parseFloat(l.line_total),
      doc_type: l.document.doc_type
    }));

    return ok(res, docs);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update, confirm, revise, achievedDocuments };
