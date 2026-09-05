// backend/src/routes/documents.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { postDocumentEntry } = require('../services/postingEngine');

const router = express.Router();
router.use(authenticateToken);

function generateDocNumber(doc_type) {
  const year = new Date().getFullYear();
  const prefixMap = {
    PO: 'PO',
    VENDOR_BILL: 'Bill',
    SO: 'SO',
    CUSTOMER_INVOICE: 'INV'
  };
  const prefix = prefixMap[doc_type] || 'DOC';
  const count = store.documents.filter(d => d.doc_type === doc_type).length + 1;
  const numPadded = String(count).padStart(4, '0');
  return `${prefix}/${year}/${numPadded}`;
}

// GET /documents
router.get('/', (req, res) => {
  let { doc_type, contact_id, status } = req.query;
  let list = store.documents;

  // Contact role security enforcement
  if (req.user.role === 'contact') {
    list = list.filter(d => d.contact_id === req.user.contact_id && d.doc_type === 'CUSTOMER_INVOICE');
    return res.json({ data: list });
  }

  if (doc_type) {
    list = list.filter(d => d.doc_type === doc_type);
  }
  if (contact_id) {
    list = list.filter(d => d.contact_id === parseInt(contact_id));
  }
  if (status) {
    list = list.filter(d => d.status === status);
  }

  res.json({ data: list });
});

// GET /documents/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const doc = store.documents.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
  }

  if (req.user.role === 'contact' && (doc.contact_id !== req.user.contact_id || doc.doc_type !== 'CUSTOMER_INVOICE')) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized to view this document' } });
  }

  res.json({ data: doc });
});

// POST /documents
router.post('/', requireRole('admin'), (req, res) => {
  const { doc_type, contact_id, doc_date, due_date, reference, lines = [] } = req.body;

  if (!doc_type || !contact_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Document type and contact are required' } });
  }

  const contact = store.contacts.find(c => c.id === parseInt(contact_id));
  const contactName = contact ? contact.name : '';

  let total = 0;
  const formattedLines = lines.map((l, index) => {
    const prod = store.products.find(p => p.id === parseInt(l.product_id));
    const analytic = store.analytics.find(a => a.id === parseInt(l.analytic_account_id));
    const qty = parseFloat(l.qty) || 1;
    const unit_price = parseFloat(l.unit_price) || (prod ? prod.sales_price : 0);
    const line_total = qty * unit_price;
    total += line_total;

    return {
      id: store.counters.docLine++,
      product_id: prod ? prod.id : parseInt(l.product_id) || null,
      product_name: prod ? prod.name : '',
      analytic_account_id: analytic ? analytic.id : parseInt(l.analytic_account_id) || null,
      analytic_account_name: analytic ? analytic.name : '',
      qty,
      unit_price,
      line_total
    };
  });

  const newDoc = {
    id: store.counters.document++,
    doc_type,
    number: generateDocNumber(doc_type),
    contact_id: parseInt(contact_id),
    contact_name: contactName,
    source_document_id: null,
    source_document_number: null,
    doc_date: doc_date || new Date().toISOString().split('T')[0],
    due_date: due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    reference: reference || '',
    status: 'draft',
    total,
    amount_paid: 0,
    amount_due: total,
    lines: formattedLines
  };

  store.documents.push(newDoc);
  res.status(201).json({ data: newDoc });
});

// PUT /documents/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const idx = store.documents.findIndex(d => d.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
  }

  const existing = store.documents[idx];
  if (existing.status !== 'draft') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only draft documents can be edited' } });
  }

  const { contact_id, doc_date, due_date, reference, lines } = req.body;
  let contactName = existing.contact_name;
  let parsedContactId = existing.contact_id;

  if (contact_id) {
    parsedContactId = parseInt(contact_id);
    const c = store.contacts.find(con => con.id === parsedContactId);
    if (c) contactName = c.name;
  }

  let formattedLines = existing.lines;
  let total = existing.total;

  if (lines && Array.isArray(lines)) {
    total = 0;
    formattedLines = lines.map(l => {
      const prod = store.products.find(p => p.id === parseInt(l.product_id));
      const analytic = store.analytics.find(a => a.id === parseInt(l.analytic_account_id));
      const qty = parseFloat(l.qty) || 1;
      const unit_price = parseFloat(l.unit_price) || (prod ? prod.sales_price : 0);
      const line_total = qty * unit_price;
      total += line_total;

      return {
        id: l.id || store.counters.docLine++,
        product_id: prod ? prod.id : parseInt(l.product_id) || null,
        product_name: prod ? prod.name : '',
        analytic_account_id: analytic ? analytic.id : parseInt(l.analytic_account_id) || null,
        analytic_account_name: analytic ? analytic.name : '',
        qty,
        unit_price,
        line_total
      };
    });
  }

  const updated = {
    ...existing,
    contact_id: parsedContactId,
    contact_name: contactName,
    doc_date: doc_date || existing.doc_date,
    due_date: due_date || existing.due_date,
    reference: reference !== undefined ? reference : existing.reference,
    lines: formattedLines,
    total,
    amount_due: total - existing.amount_paid
  };

  store.documents[idx] = updated;
  res.json({ data: updated });
});

// POST /documents/:id/confirm
router.post('/:id/confirm', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const doc = store.documents.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
  }

  if (doc.status !== 'draft') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Document is already confirmed or processed' } });
  }

  doc.status = 'confirmed';

  let journalEntry = null;
  if (doc.doc_type === 'VENDOR_BILL' || doc.doc_type === 'CUSTOMER_INVOICE') {
    journalEntry = postDocumentEntry(doc);
  }

  res.json({
    data: {
      id: doc.id,
      status: doc.status,
      journal_entry_id: journalEntry ? journalEntry.id : null
    }
  });
});

// POST /documents/:id/convert
router.post('/:id/convert', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const sourceDoc = store.documents.find(d => d.id === id);
  if (!sourceDoc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Source document not found' } });
  }

  let targetType = null;
  if (sourceDoc.doc_type === 'PO') targetType = 'VENDOR_BILL';
  else if (sourceDoc.doc_type === 'SO') targetType = 'CUSTOMER_INVOICE';

  if (!targetType) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only PO or SO can be converted' } });
  }

  const newDoc = {
    id: store.counters.document++,
    doc_type: targetType,
    number: generateDocNumber(targetType),
    contact_id: sourceDoc.contact_id,
    contact_name: sourceDoc.contact_name,
    source_document_id: sourceDoc.id,
    source_document_number: sourceDoc.number,
    doc_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    reference: sourceDoc.reference,
    status: 'draft',
    total: sourceDoc.total,
    amount_paid: 0,
    amount_due: sourceDoc.total,
    lines: sourceDoc.lines.map(l => ({
      ...l,
      id: store.counters.docLine++
    }))
  };

  store.documents.push(newDoc);
  res.status(201).json({ data: newDoc });
});

module.exports = router;
