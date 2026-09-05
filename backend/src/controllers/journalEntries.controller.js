const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

function shapeEntry(e) {
  return {
    ...e,
    journal_name: e.journal?.name ?? null,
    lines: (e.lines || []).map(l => ({
      ...l,
      account_name: l.account?.name ?? null,
      debit: parseFloat(l.debit),
      credit: parseFloat(l.credit)
    }))
  };
}

const getAll = async (req, res, next) => {
  try {
    const { journal_id, document_id } = req.query;
    const filter = {};
    if (journal_id) filter.journal_id = parseInt(journal_id);
    if (document_id) filter.document_id = parseInt(document_id);
    const entries = await prisma.journalEntry.findMany({
      where: filter,
      include: { journal: true, lines: { include: { account: true } } }
    });
    return ok(res, entries.map(shapeEntry));
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { journal: true, lines: { include: { account: true } } }
    });
    if (!entry) return errorResponse(res, 404, 'NOT_FOUND', 'Journal Entry not found');
    return ok(res, shapeEntry(entry));
  } catch (error) { next(error); }
};

module.exports = { getAll, getById };
