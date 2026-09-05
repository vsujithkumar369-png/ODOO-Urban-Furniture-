const { pool } = require('../db');
const { errorResponse, ok } = require('../utils/errors');
const { postPaymentEntry } = require('../services/postingEngine');

const createPayment = async (req, res, next) => {
  try {
    const { document_id, direction, amount, pay_date, method, note } = req.body;
    if (!document_id || !direction || amount === undefined || !method) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'document_id, direction, amount and method are required');
    }

    const docId = parseInt(document_id);
    const docRes = await pool.query('SELECT * FROM documents WHERE id = $1', [docId]);
    if (docRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    const doc = docRes.rows[0];

    if (req.user && req.user.role === 'contact') {
      if (doc.contact_id !== req.user.contact_id || direction !== 'receive') {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied to pay this document');
      }
    }

    const amt = parseFloat(amount);
    const currentPaid = parseFloat(doc.amount_paid || 0);
    const total = parseFloat(doc.total || 0);
    const newPaid = currentPaid + amt;

    if (newPaid > total + 0.01) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Payment amount exceeds remaining amount due');
    }

    const newStatus = newPaid >= total - 0.01 ? 'paid' : 'confirmed';
    const newDue = Math.max(total - newPaid, 0);

    const payDateStr = pay_date || new Date().toISOString().split('T')[0];

    const payRes = await pool.query(
      `INSERT INTO payments (document_id, direction, amount, pay_date, method, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [docId, direction, amt, payDateStr, method, note || null]
    );
    const payment = payRes.rows[0];

    const entry = await postPaymentEntry(payment, doc);

    if (entry && entry.id) {
      await pool.query('UPDATE payments SET journal_entry_id = $1 WHERE id = $2', [entry.id, payment.id]);
      payment.journal_entry_id = entry.id;
    }

    await pool.query(
      `UPDATE documents SET amount_paid = $1, amount_due = $2, status = $3 WHERE id = $4`,
      [newPaid, newDue, newStatus, docId]
    );

    return res.status(201).json({
      data: {
        id: payment.id,
        document_id: docId,
        amount: parseFloat(payment.amount),
        journal_entry_id: payment.journal_entry_id
      },
      document_status: newStatus
    });
  } catch (error) { next(error); }
};

const getPayments = async (req, res, next) => {
  try {
    const { document_id } = req.query;
    let query = 'SELECT * FROM payments';
    const params = [];
    if (document_id) {
      params.push(parseInt(document_id));
      query += ' WHERE document_id = $1';
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    return ok(res, result.rows.map(p => ({ ...p, amount: parseFloat(p.amount) })));
  } catch (error) { next(error); }
};

module.exports = {
  createPayment,
  getPayments
};

