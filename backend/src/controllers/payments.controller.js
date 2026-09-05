const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const { recordPayment } = require('../services/postingEngine');
const prisma = new PrismaClient();

const create = async (req, res, next) => {
  try {
    const { document_id, direction, amount, pay_date, method, note } = req.body;
    if (!document_id || !direction || amount === undefined || !method) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'document_id, direction, amount and method are required');
    }
    const doc = await prisma.document.findUnique({ where: { id: parseInt(document_id) } });
    if (!doc) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (req.user.role === 'contact') {
      if (doc.doc_type !== 'CUSTOMER_INVOICE' || doc.contact_id !== req.user.contact_id || direction !== 'receive') {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied to pay this document');
      }
    }
    try {
      const result = await recordPayment(parseInt(document_id), direction, amount, method, pay_date, note);
      return res.status(201).json({
        data: { id: result.payment.id, document_id: parseInt(document_id), amount: parseFloat(result.payment.amount), journal_entry_id: result.payment.journal_entry_id },
        document_status: result.document_status
      });
    } catch (e) {
      if (e.code === 'VALIDATION_ERROR') return errorResponse(res, 400, 'VALIDATION_ERROR', e.message);
      throw e;
    }
  } catch (error) { next(error); }
};

const getByDocumentId = async (req, res, next) => {
  try {
    const { document_id } = req.query;
    if (!document_id) return errorResponse(res, 400, 'BAD_REQUEST', 'document_id query parameter is required');
    const doc = await prisma.document.findUnique({ where: { id: parseInt(document_id) } });
    if (!doc) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (req.user.role === 'contact') {
      if (doc.doc_type !== 'CUSTOMER_INVOICE' || doc.contact_id !== req.user.contact_id) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied');
      }
    }
    const payments = await prisma.payment.findMany({ where: { document_id: parseInt(document_id) } });
    return ok(res, payments.map(p => ({ ...p, amount: parseFloat(p.amount) })));
  } catch (error) { next(error); }
};

module.exports = { create, getByDocumentId };
