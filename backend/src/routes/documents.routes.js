// backend/src/routes/documents.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { postDocumentEntry } = require('../services/postingEngine');

const router = express.Router();
router.use(authenticateToken);

async function generateDocNumber(doc_type) {
  const year = new Date().getFullYear();
  const prefixMap = {
    PO: 'PO',
    VENDOR_BILL: 'Bill',
    SO: 'SO',
    CUSTOMER_INVOICE: 'INV'
  };
  const prefix = prefixMap[doc_type] || 'DOC';
  const countRes = await pool.query('SELECT COUNT(*) FROM documents WHERE doc_type = $1', [doc_type]);
  const count = parseInt(countRes.rows[0].count) + 1;
  const numPadded = String(count).padStart(4, '0');
  return `${prefix}/${year}/${numPadded}`;
}

async function fetchDocumentWithLines(id) {
  const docRes = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
  if (docRes.rows.length === 0) return null;

  const doc = docRes.rows[0];
  const linesRes = await pool.query('SELECT * FROM document_lines WHERE document_id = $1 ORDER BY id ASC', [id]);
  return {
    ...doc,
    total: parseFloat(doc.total) || 0,
    amount_paid: parseFloat(doc.amount_paid) || 0,
    amount_due: parseFloat(doc.amount_due) || 0,
    lines: linesRes.rows.map(l => ({
      ...l,
      qty: parseFloat(l.qty) || 0,
      unit_price: parseFloat(l.unit_price) || 0,
      line_total: parseFloat(l.line_total) || 0
    }))
  };
}

// GET /documents
router.get('/', async (req, res) => {
  let { doc_type, contact_id, status } = req.query;

  try {
    let query = 'SELECT * FROM documents WHERE 1=1';
    const params = [];

    // Security for portal contact
    if (req.user.role === 'contact') {
      params.push(req.user.contact_id, 'CUSTOMER_INVOICE');
      query += ` AND contact_id = $${params.length - 1} AND doc_type = $${params.length}`;
    } else {
      if (doc_type) {
        params.push(doc_type);
        query += ` AND doc_type = $${params.length}`;
      }
      if (contact_id) {
        params.push(parseInt(contact_id));
        query += ` AND contact_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);

    const docIds = result.rows.map(r => r.id);
    let allLines = [];
    if (docIds.length > 0) {
      const linesRes = await pool.query('SELECT * FROM document_lines WHERE document_id = ANY($1::int[]) ORDER BY id ASC', [docIds]);
      allLines = linesRes.rows;
    }

    const docs = result.rows.map(doc => ({
      ...doc,
      total: parseFloat(doc.total) || 0,
      amount_paid: parseFloat(doc.amount_paid) || 0,
      amount_due: parseFloat(doc.amount_due) || 0,
      lines: allLines.filter(l => l.document_id === doc.id).map(l => ({
        ...l,
        qty: parseFloat(l.qty) || 0,
        unit_price: parseFloat(l.unit_price) || 0,
        line_total: parseFloat(l.line_total) || 0
      }))
    }));

    res.json({ data: docs });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch documents' } });
  }
});

// GET /documents/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const doc = await fetchDocumentWithLines(id);
    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    if (req.user.role === 'contact' && (doc.contact_id !== req.user.contact_id || doc.doc_type !== 'CUSTOMER_INVOICE')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized to view this document' } });
    }

    res.json({ data: doc });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch document' } });
  }
});

// POST /documents
router.post('/', requireRole('admin'), async (req, res) => {
  const { doc_type, contact_id, doc_date, due_date, reference = '', lines = [] } = req.body;

  if (!doc_type || !contact_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Document type and contact are required' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const contactRes = await client.query('SELECT name FROM contacts WHERE id = $1', [parseInt(contact_id)]);
    const contactName = contactRes.rows.length > 0 ? contactRes.rows[0].name : '';

    let total = 0;
    const computedLines = [];
    for (const l of lines) {
      const pRes = l.product_id ? await client.query('SELECT name, sales_price FROM products WHERE id = $1', [parseInt(l.product_id)]) : { rows: [] };
      const aRes = l.analytic_account_id ? await client.query('SELECT name FROM analytic_accounts WHERE id = $1', [parseInt(l.analytic_account_id)]) : { rows: [] };

      const prodName = pRes.rows.length > 0 ? pRes.rows[0].name : '';
      const analyticName = aRes.rows.length > 0 ? aRes.rows[0].name : '';
      const defaultPrice = pRes.rows.length > 0 ? parseFloat(pRes.rows[0].sales_price) : 0;

      const qty = parseFloat(l.qty) || 1;
      const unit_price = parseFloat(l.unit_price) !== undefined && !isNaN(parseFloat(l.unit_price)) ? parseFloat(l.unit_price) : defaultPrice;
      const line_total = qty * unit_price;
      total += line_total;

      computedLines.push({
        product_id: parseInt(l.product_id) || null,
        product_name: prodName,
        analytic_account_id: parseInt(l.analytic_account_id) || null,
        analytic_account_name: analyticName,
        qty,
        unit_price,
        line_total
      });
    }

    const number = await generateDocNumber(doc_type);
    const dateStr = doc_date || new Date().toISOString().split('T')[0];
    const dueDateStr = due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const docInsert = await client.query(
      `INSERT INTO documents (doc_type, number, contact_id, contact_name, doc_date, due_date, reference, status, total, amount_paid, amount_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, 0, $8) RETURNING *`,
      [doc_type, number, parseInt(contact_id), contactName, dateStr, dueDateStr, reference, total]
    );
    const newDoc = docInsert.rows[0];

    for (const cl of computedLines) {
      const lineInsert = await client.query(
        `INSERT INTO document_lines (document_id, product_id, product_name, analytic_account_id, analytic_account_name, qty, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [newDoc.id, cl.product_id, cl.product_name, cl.analytic_account_id, cl.analytic_account_name, cl.qty, cl.unit_price, cl.line_total]
      );
      cl.id = lineInsert.rows[0].id;
    }

    await client.query('COMMIT');

    res.status(201).json({
      data: {
        ...newDoc,
        total,
        amount_paid: 0,
        amount_due: total,
        lines: computedLines
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating document:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create document' } });
  } finally {
    client.release();
  }
});

// PUT /documents/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { contact_id, doc_date, due_date, reference, lines } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const existing = existingRes.rows[0];
    if (existing.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only draft documents can be edited' } });
    }

    let contactName = existing.contact_name;
    let parsedContactId = existing.contact_id;
    if (contact_id) {
      parsedContactId = parseInt(contact_id);
      const cRes = await client.query('SELECT name FROM contacts WHERE id = $1', [parsedContactId]);
      if (cRes.rows.length > 0) contactName = cRes.rows[0].name;
    }

    let total = parseFloat(existing.total) || 0;
    if (lines && Array.isArray(lines)) {
      await client.query('DELETE FROM document_lines WHERE document_id = $1', [id]);
      total = 0;
      for (const l of lines) {
        const pRes = l.product_id ? await client.query('SELECT name, sales_price FROM products WHERE id = $1', [parseInt(l.product_id)]) : { rows: [] };
        const aRes = l.analytic_account_id ? await client.query('SELECT name FROM analytic_accounts WHERE id = $1', [parseInt(l.analytic_account_id)]) : { rows: [] };

        const prodName = pRes.rows.length > 0 ? pRes.rows[0].name : '';
        const analyticName = aRes.rows.length > 0 ? aRes.rows[0].name : '';
        const defaultPrice = pRes.rows.length > 0 ? parseFloat(pRes.rows[0].sales_price) : 0;

        const qty = parseFloat(l.qty) || 1;
        const unit_price = parseFloat(l.unit_price) !== undefined && !isNaN(parseFloat(l.unit_price)) ? parseFloat(l.unit_price) : defaultPrice;
        const line_total = qty * unit_price;
        total += line_total;

        await client.query(
          `INSERT INTO document_lines (document_id, product_id, product_name, analytic_account_id, analytic_account_name, qty, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, parseInt(l.product_id) || null, prodName, parseInt(l.analytic_account_id) || null, analyticName, qty, unit_price, line_total]
        );
      }
    }

    const updateRes = await client.query(
      `UPDATE documents SET
        contact_id = $1, contact_name = $2, doc_date = $3, due_date = $4, reference = $5,
        total = $6, amount_due = $6 - amount_paid
       WHERE id = $7 RETURNING *`,
      [
        parsedContactId,
        contactName,
        doc_date || existing.doc_date,
        due_date || existing.due_date,
        reference !== undefined ? reference : existing.reference,
        total,
        id
      ]
    );

    await client.query('COMMIT');
    const updated = await fetchDocumentWithLines(id);
    res.json({ data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating document:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update document' } });
  } finally {
    client.release();
  }
});

// POST /documents/:id/confirm
router.post('/:id/confirm', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const doc = await fetchDocumentWithLines(id);
    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    if (doc.status !== 'draft') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Document is already confirmed or processed' } });
    }

    await pool.query("UPDATE documents SET status = 'confirmed' WHERE id = $1", [id]);
    doc.status = 'confirmed';

    let journalEntry = null;
    if (doc.doc_type === 'VENDOR_BILL' || doc.doc_type === 'CUSTOMER_INVOICE') {
      journalEntry = await postDocumentEntry(doc);
    }

    res.json({
      data: {
        id: doc.id,
        status: 'confirmed',
        journal_entry_id: journalEntry ? journalEntry.id : null
      }
    });
  } catch (err) {
    console.error('Error confirming document:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to confirm document' } });
  }
});

// POST /documents/:id/convert
router.post('/:id/convert', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const sourceDoc = await fetchDocumentWithLines(id);
    if (!sourceDoc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Source document not found' } });
    }

    let targetType = null;
    if (sourceDoc.doc_type === 'PO') targetType = 'VENDOR_BILL';
    else if (sourceDoc.doc_type === 'SO') targetType = 'CUSTOMER_INVOICE';

    if (!targetType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only PO or SO can be converted' } });
    }

    const number = await generateDocNumber(targetType);
    const dateStr = new Date().toISOString().split('T')[0];
    const dueDateStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const docInsert = await client.query(
        `INSERT INTO documents (doc_type, number, contact_id, contact_name, source_document_id, source_document_number, doc_date, due_date, reference, status, total, amount_paid, amount_due)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, 0, $10) RETURNING *`,
        [
          targetType,
          number,
          sourceDoc.contact_id,
          sourceDoc.contact_name,
          sourceDoc.id,
          sourceDoc.number,
          dateStr,
          dueDateStr,
          sourceDoc.reference,
          sourceDoc.total
        ]
      );
      const newDoc = docInsert.rows[0];

      for (const line of sourceDoc.lines) {
        await client.query(
          `INSERT INTO document_lines (document_id, product_id, product_name, analytic_account_id, analytic_account_name, qty, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newDoc.id, line.product_id, line.product_name, line.analytic_account_id, line.analytic_account_name, line.qty, line.unit_price, line.line_total]
        );
      }

      await client.query('COMMIT');
      const fullDoc = await fetchDocumentWithLines(newDoc.id);
      res.status(201).json({ data: fullDoc });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to convert document' } });
  }
});

module.exports = router;
