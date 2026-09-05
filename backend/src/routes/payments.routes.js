// backend/src/routes/payments.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken } = require('../middleware/auth');
const { postPaymentEntry } = require('../services/postingEngine');

const router = express.Router();
router.use(authenticateToken);

// GET /payments
router.get('/', (req, res) => {
  const { document_id } = req.query;
  let list = store.payments;
  if (document_id) {
    list = list.filter(p => p.document_id === parseInt(document_id));
  }
  res.json({ data: list });
});

// POST /payments
router.post('/', (req, res) => {
  const { document_id, direction = 'send', amount, pay_date, method = 'bank', note = '' } = req.body;

  if (!document_id || amount === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Document ID and amount are required' } });
  }

  const doc = store.documents.find(d => d.id === parseInt(document_id));
  if (!doc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
  }

  if (req.user.role === 'contact') {
    if (doc.contact_id !== req.user.contact_id || doc.doc_type !== 'CUSTOMER_INVOICE') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized to pay this document' } });
    }
  }

  const payAmount = parseFloat(amount);
  if (payAmount <= 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Payment amount must be greater than 0' } });
  }

  if (payAmount > doc.amount_due) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Amount exceeds amount due' } });
  }

  doc.amount_paid = (doc.amount_paid || 0) + payAmount;
  doc.amount_due = doc.total - doc.amount_paid;

  if (doc.amount_due <= 0.001) {
    doc.status = 'paid';
    doc.amount_due = 0;
  } else {
    doc.status = 'partially_paid';
  }

  const newPayment = {
    id: store.counters.payment++,
    document_id: doc.id,
    direction,
    amount: payAmount,
    pay_date: pay_date || new Date().toISOString().split('T')[0],
    method,
    note
  };

  const journalEntry = postPaymentEntry(newPayment, doc);
  newPayment.journal_entry_id = journalEntry ? journalEntry.id : null;

  store.payments.push(newPayment);

  res.status(201).json({
    data: {
      id: newPayment.id,
      document_id: doc.id,
      amount: newPayment.amount,
      journal_entry_id: newPayment.journal_entry_id
    },
    document_status: doc.status
  });
});

module.exports = router;
