// backend/src/routes/payments.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { postPaymentEntry } = require('../services/postingEngine');

const router = express.Router();
router.use(authenticateToken);

// GET /payments
router.get('/', async (req, res) => {
  const { document_id } = req.query;
  try {
    let query = 'SELECT * FROM payments';
    const params = [];
    if (document_id) {
      query += ' WHERE document_id = $1';
      params.push(parseInt(document_id));
    }
    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    const payments = result.rows.map(p => ({
      ...p,
      amount: parseFloat(p.amount) || 0
    }));
    res.json({ data: payments });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch payments' } });
  }
});

// POST /payments
router.post('/', async (req, res) => {
  const { document_id, direction = 'send', amount, pay_date, method = 'bank', note = '' } = req.body;

  if (!document_id || amount === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Document ID and amount are required' } });
  }

  const payAmount = parseFloat(amount);
  if (payAmount <= 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Payment amount must be greater than 0' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const docRes = await client.query('SELECT * FROM documents WHERE id = $1', [parseInt(document_id)]);
    if (docRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const doc = docRes.rows[0];
    const total = parseFloat(doc.total) || 0;
    const currentPaid = parseFloat(doc.amount_paid) || 0;
    const currentDue = parseFloat(doc.amount_due) || 0;

    if (req.user.role === 'contact') {
      if (doc.contact_id !== req.user.contact_id || doc.doc_type !== 'CUSTOMER_INVOICE') {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized to pay this document' } });
      }
    }

    if (payAmount > currentDue) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Amount exceeds amount due' } });
    }

    const newPaid = currentPaid + payAmount;
    let newDue = total - newPaid;
    let newStatus = doc.status;

    if (newDue <= 0.001) {
      newStatus = 'paid';
      newDue = 0;
    } else {
      newStatus = 'partially_paid';
    }

    await client.query(
      'UPDATE documents SET amount_paid = $1, amount_due = $2, status = $3 WHERE id = $4',
      [newPaid, newDue, newStatus, doc.id]
    );

    const payInsert = await client.query(
      `INSERT INTO payments (document_id, direction, amount, pay_date, method, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [doc.id, direction, payAmount, pay_date || new Date().toISOString().split('T')[0], method, note]
    );
    const newPayment = payInsert.rows[0];

    const journalEntry = await postPaymentEntry(newPayment, doc);
    if (journalEntry) {
      await client.query('UPDATE payments SET journal_entry_id = $1 WHERE id = $2', [journalEntry.id, newPayment.id]);
      newPayment.journal_entry_id = journalEntry.id;
    }

    await client.query('COMMIT');

    res.status(201).json({
      data: {
        id: newPayment.id,
        document_id: doc.id,
        amount: payAmount,
        journal_entry_id: newPayment.journal_entry_id
      },
      document_status: newStatus
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to record payment' } });
  } finally {
    client.release();
  }
});

module.exports = router;
