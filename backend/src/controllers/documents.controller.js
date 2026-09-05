const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const { postDocument } = require('../services/postingEngine');
const prisma = new PrismaClient();

const generateNumber = async (docType) => {
  const count = await prisma.document.count({ where: { doc_type: docType } });
  const num = (count + 1).toString().padStart(4, '0');
  const year = new Date().getFullYear();
  if (docType === 'PO') return `PO/${year}/${num}`;
  if (docType === 'VENDOR_BILL') return `BILL/${year}/${num}`;
  if (docType === 'SO') return `SO/${year}/${num}`;
  if (docType === 'CUSTOMER_INVOICE') return `INV/${year}/${num}`;
  return `DOC/${year}/${num}`;
};

async function shapeDoc(doc) {
  const total = parseFloat(doc.total);
  const amount_paid = parseFloat(doc.amount_paid);
  const contact = doc.contact || (doc.contact_id ? await prisma.contact.findUnique({ where: { id: doc.contact_id } }) : null);
  const sourceDoc = doc.source_document_id
    ? await prisma.document.findUnique({ where: { id: doc.source_document_id }, select: { number: true } })
    : null;
  const lines = (doc.lines || []).map(l => ({
    ...l,
    qty: parseFloat(l.qty),
    unit_price: parseFloat(l.unit_price),
    line_total: parseFloat(l.line_total)
  }));
  return {
    ...doc,
    total,
    amount_paid,
    amount_due: total - amount_paid,
    contact_name: contact?.name ?? null,
    source_document_number: sourceDoc?.number ?? null,
    lines
  };
}

const getAll = async (req, res, next) => {
  try {
    const { doc_type, contact_id, status } = req.query;
    const filter = {};
    if (doc_type) filter.doc_type = doc_type;
    if (contact_id) filter.contact_id = parseInt(contact_id);
    if (status) filter.status = status;
    if (req.user.role === 'contact') {
      filter.doc_type = 'CUSTOMER_INVOICE';
      filter.contact_id = req.user.contact_id;
    }
    const docs = await prisma.document.findMany({ where: filter, include: { lines: true, contact: true } });
    const shaped = await Promise.all(docs.map(shapeDoc));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { lines: { include: { product: true, analytic_account: true } }, contact: true }
    });
    if (!doc) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (req.user.role === 'contact') {
      if (doc.doc_type !== 'CUSTOMER_INVOICE' || doc.contact_id !== req.user.contact_id) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied');
      }
    }
    const shaped = await shapeDoc(doc);
    // Add line-level names
    shaped.lines = shaped.lines.map((l, i) => ({
      ...l,
      product_name: doc.lines[i]?.product?.name ?? null,
      analytic_account_name: doc.lines[i]?.analytic_account?.name ?? null
    }));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { doc_type, contact_id, doc_date, due_date, reference, lines } = req.body;
    if (!doc_type || !contact_id) return errorResponse(res, 400, 'VALIDATION_ERROR', 'doc_type and contact_id are required');

    const number = await generateNumber(doc_type);
    let total = 0;
    const processedLines = (lines || []).map(line => {
      const qty = parseFloat(line.qty) || 0;
      const unit_price = parseFloat(line.unit_price) || 0;
      const line_total = qty * unit_price;
      total += line_total;
      return { product_id: line.product_id, analytic_account_id: line.analytic_account_id || null, qty, unit_price, line_total };
    });

    const doc = await prisma.document.create({
      data: { doc_type, number, contact_id, doc_date: doc_date ? new Date(doc_date) : new Date(), due_date: due_date ? new Date(due_date) : new Date(), reference, status: 'draft', total, amount_paid: 0, lines: { create: processedLines } },
      include: { lines: true, contact: true }
    });
    return ok(res, await shapeDoc(doc), 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const existing = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (existing.status !== 'draft') return errorResponse(res, 400, 'BAD_REQUEST', 'Only draft documents can be updated');
    const { doc_type, contact_id, doc_date, due_date, reference } = req.body;
    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: { contact_id, doc_date: doc_date ? new Date(doc_date) : undefined, due_date: due_date ? new Date(due_date) : undefined, reference },
      include: { lines: true, contact: true }
    });
    return ok(res, await shapeDoc(doc));
  } catch (error) { next(error); }
};

const confirm = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existing = await prisma.document.findUnique({ where: { id: docId } });
    if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (existing.status !== 'draft') return errorResponse(res, 400, 'BAD_REQUEST', 'Only draft documents can be confirmed');

    if (['PO', 'SO'].includes(existing.doc_type)) {
      await prisma.document.update({ where: { id: docId }, data: { status: 'confirmed' } });
      const updated = await prisma.document.findUnique({ where: { id: docId }, include: { lines: true, contact: true } });
      return ok(res, await shapeDoc(updated));
    } else {
      try {
        const journalEntry = await postDocument(docId);
        const updated = await prisma.document.findUnique({ where: { id: docId }, include: { lines: true, contact: true } });
        const shaped = await shapeDoc(updated);
        return ok(res, { ...shaped, journal_entry_id: journalEntry.id });
      } catch (postError) {
        return errorResponse(res, 500, 'POSTING_ERROR', postError.message);
      }
    }
  } catch (error) { next(error); }
};

const convert = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existing = await prisma.document.findUnique({ where: { id: docId }, include: { lines: true } });
    if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (existing.status !== 'confirmed') return errorResponse(res, 400, 'BAD_REQUEST', 'Document must be confirmed to convert');
    let newDocType;
    if (existing.doc_type === 'PO') newDocType = 'VENDOR_BILL';
    else if (existing.doc_type === 'SO') newDocType = 'CUSTOMER_INVOICE';
    else return errorResponse(res, 400, 'BAD_REQUEST', 'Cannot convert this document type');
    const number = await generateNumber(newDocType);
    const newDoc = await prisma.document.create({
      data: {
        doc_type: newDocType, number, contact_id: existing.contact_id, source_document_id: existing.id,
        doc_date: new Date(), due_date: new Date(), reference: existing.number, status: 'draft',
        total: existing.total, amount_paid: 0,
        lines: { create: existing.lines.map(l => ({ product_id: l.product_id, analytic_account_id: l.analytic_account_id, qty: l.qty, unit_price: l.unit_price, line_total: l.line_total })) }
      },
      include: { lines: true, contact: true }
    });
    return ok(res, await shapeDoc(newDoc), 201);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update, confirm, convert };
