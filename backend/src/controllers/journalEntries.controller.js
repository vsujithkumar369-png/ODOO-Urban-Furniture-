const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const { journal_id, document_id } = req.query;
    const filter = {};
    if (journal_id) filter.journal_id = parseInt(journal_id);
    if (document_id) filter.document_id = parseInt(document_id);

    const entries = await prisma.journalEntry.findMany({
      where: filter,
      include: {
        lines: {
          include: { account: true }
        }
      }
    });
    res.status(200).json(entries);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        lines: {
          include: { account: true }
        }
      }
    });
    if (!entry) return errorResponse(res, 404, 'NOT_FOUND', 'Journal Entry not found');
    res.status(200).json(entry);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById };
