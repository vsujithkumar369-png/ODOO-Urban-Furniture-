const { pool } = require('../db');
const { errorResponse, ok } = require('../utils/errors');
const { postDocumentEntry } = require('../services/postingEngine');

const generateNumber = async (docType) => {
  const countRes = await pool.query('SELECT COUNT(*) FROM documents WHERE doc_type = $1', [docType]);
  const count = parseInt(countRes.rows[0].count);
  const num = (count + 1).toString().padStart(4, '0');
  const year = new Date().getFullYear();
  if (docType === 'PO') return `PO/${year}/${num}`;
  if (docType === 'VENDOR_BILL' || docType === 'BILL') return `Bill/${year}/${num}`;
  if (docType === 'SO') return `SO/${year}/${num}`;
  if (docType === 'CUSTOMER_INVOICE' || docType === 'INVOICE') return `INV/${year}/${num}`;
  return `DOC/${year}/${num}`;
};

async function shapeDoc(doc) {
  const total = parseFloat(doc.total || 0);
  const amount_paid = parseFloat(doc.amount_paid || 0);

  let contactName = doc.contact_name;
  if (!contactName && doc.contact_id) {
    const cRes = await pool.query('SELECT name FROM contacts WHERE id = $1', [doc.contact_id]);
    if (cRes.rows.length > 0) contactName = cRes.rows[0].name;
  }

  let sourceDocNum = doc.source_document_number;
  if (!sourceDocNum && doc.source_document_id) {
    const sRes = await pool.query('SELECT number FROM documents WHERE id = $1', [doc.source_document_id]);
    if (sRes.rows.length > 0) sourceDocNum = sRes.rows[0].number;
  }

  let lines = doc.lines;
  if (!lines && doc.id) {
    const lRes = await pool.query('SELECT * FROM document_lines WHERE document_id = $1 ORDER BY id ASC', [doc.id]);
    lines = lRes.rows;
  }

  const shapedLines = (lines || []).map(l => ({
    ...l,
    qty: parseFloat(l.qty || 1),
    unit_price: parseFloat(l.unit_price || 0),
    line_total: parseFloat(l.line_total || 0)
  }));

  return {
    ...doc,
    total,
    amount_paid,
    amount_due: total - amount_paid,
    contact_name: contactName,
    source_document_number: sourceDocNum,
    lines: shapedLines
  };
}

const getDocuments = async (req, res, next) => {
  try {
    const { doc_type, contact_id, status } = req.query;
    let query = 'SELECT * FROM documents WHERE 1=1';
    const params = [];

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
    if (req.user && req.user.role === 'contact') {
      params.push(req.user.contact_id);
      query += ` AND contact_id = $${params.length}`;
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    const shaped = await Promise.all(result.rows.map(shapeDoc));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getDocumentById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const docRes = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    const doc = docRes.rows[0];

    if (req.user && req.user.role === 'contact') {
      if (doc.contact_id !== req.user.contact_id) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied');
      }
    }

    const linesRes = await pool.query('SELECT * FROM document_lines WHERE document_id = $1 ORDER BY id ASC', [id]);
    doc.lines = linesRes.rows;
    return ok(res, await shapeDoc(doc));
  } catch (error) { next(error); }
};

const createDocument = async (req, res, next) => {
  try {
    const { doc_type, contact_id, doc_date, due_date, reference, lines } = req.body;
    if (!doc_type || !contact_id) return errorResponse(res, 400, 'VALIDATION_ERROR', 'doc_type and contact_id are required');

    const cRes = await pool.query('SELECT name FROM contacts WHERE id = $1', [contact_id]);
    const contactName = cRes.rows.length > 0 ? cRes.rows[0].name : null;

    const number = await generateNumber(doc_type);
    let total = 0;

    const processedLines = [];
    for (const line of (lines || [])) {
      const qty = parseFloat(line.qty) || 0;
      const unit_price = parseFloat(line.unit_price) || 0;
      const line_total = qty * unit_price;
      total += line_total;

      let pName = line.product_name;
      if (!pName && line.product_id) {
        const pRes = await pool.query('SELECT name FROM products WHERE id = $1', [line.product_id]);
        if (pRes.rows.length > 0) pName = pRes.rows[0].name;
      }

      let aName = line.analytic_account_name;
      if (!aName && line.analytic_account_id) {
        const aRes = await pool.query('SELECT name FROM analytic_accounts WHERE id = $1', [line.analytic_account_id]);
        if (aRes.rows.length > 0) aName = aRes.rows[0].name;
      }

      processedLines.push({
        product_id: line.product_id || null,
        product_name: pName || null,
        analytic_account_id: line.analytic_account_id || null,
        analytic_account_name: aName || null,
        qty,
        unit_price,
        line_total
      });
    }

    const docDateStr = doc_date || new Date().toISOString().split('T')[0];
    const dueDateStr = due_date || docDateStr;

    const docRes = await pool.query(
      `INSERT INTO documents (doc_type, number, contact_id, contact_name, doc_date, due_date, reference, status, total, amount_paid, amount_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, 0, $8)
       RETURNING *`,
      [doc_type, number, contact_id, contactName, docDateStr, dueDateStr, reference || null, total]
    );

    const doc = docRes.rows[0];

    const insertedLines = [];
    for (const pl of processedLines) {
      const lRes = await pool.query(
        `INSERT INTO document_lines (document_id, product_id, product_name, analytic_account_id, analytic_account_name, qty, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [doc.id, pl.product_id, pl.product_name, pl.analytic_account_id, pl.analytic_account_name, pl.qty, pl.unit_price, pl.line_total]
      );
      insertedLines.push(lRes.rows[0]);
    }

    doc.lines = insertedLines;
    return ok(res, await shapeDoc(doc), 201);
  } catch (error) { next(error); }
};

const updateDocument = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existingRes = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (existingRes.rows[0].status !== 'draft') return errorResponse(res, 400, 'BAD_REQUEST', 'Only draft documents can be updated');

    const { contact_id, doc_date, due_date, reference } = req.body;
    let contactName = undefined;
    if (contact_id) {
      const cRes = await pool.query('SELECT name FROM contacts WHERE id = $1', [contact_id]);
      if (cRes.rows.length > 0) contactName = cRes.rows[0].name;
    }

    const docRes = await pool.query(
      `UPDATE documents
       SET contact_id = COALESCE($1, contact_id),
           contact_name = COALESCE($2, contact_name),
           doc_date = COALESCE($3, doc_date),
           due_date = COALESCE($4, due_date),
           reference = COALESCE($5, reference)
       WHERE id = $6
       RETURNING *`,
      [contact_id, contactName, doc_date, due_date, reference, id]
    );

    const doc = docRes.rows[0];
    const linesRes = await pool.query('SELECT * FROM document_lines WHERE document_id = $1 ORDER BY id ASC', [id]);
    doc.lines = linesRes.rows;
    return ok(res, await shapeDoc(doc));
  } catch (error) { next(error); }
};

const confirmDocument = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existingRes = await pool.query('SELECT * FROM documents WHERE id = $1', [docId]);
    if (existingRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    const existing = existingRes.rows[0];
    if (existing.status !== 'draft') return errorResponse(res, 400, 'BAD_REQUEST', 'Only draft documents can be confirmed');

    if (['PO', 'SO'].includes(existing.doc_type)) {
      await pool.query("UPDATE documents SET status = 'confirmed' WHERE id = $1", [docId]);
      const updatedRes = await pool.query('SELECT * FROM documents WHERE id = $1', [docId]);
      return ok(res, await shapeDoc(updatedRes.rows[0]));
    } else {
      try {
        await pool.query("UPDATE documents SET status = 'confirmed' WHERE id = $1", [docId]);
        const journalEntry = await postDocumentEntry(existing);
        const updatedRes = await pool.query('SELECT * FROM documents WHERE id = $1', [docId]);
        const shaped = await shapeDoc(updatedRes.rows[0]);
        return ok(res, { ...shaped, journal_entry_id: journalEntry ? journalEntry.id : null });
      } catch (postError) {
        return errorResponse(res, 500, 'POSTING_ERROR', postError.message);
      }
    }
  } catch (error) { next(error); }
};

const convertDocument = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existingRes = await pool.query('SELECT * FROM documents WHERE id = $1', [docId]);
    if (existingRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    const existing = existingRes.rows[0];
    if (existing.status !== 'confirmed') return errorResponse(res, 400, 'BAD_REQUEST', 'Document must be confirmed to convert');

    let newDocType;
    if (existing.doc_type === 'PO') newDocType = 'VENDOR_BILL';
    else if (existing.doc_type === 'SO') newDocType = 'CUSTOMER_INVOICE';
    else return errorResponse(res, 400, 'BAD_REQUEST', 'Cannot convert this document type');

    const linesRes = await pool.query('SELECT * FROM document_lines WHERE document_id = $1', [docId]);
    const existingLines = linesRes.rows;

    const number = await generateNumber(newDocType);
    const todayStr = new Date().toISOString().split('T')[0];

    const newDocRes = await pool.query(
      `INSERT INTO documents (doc_type, number, contact_id, contact_name, source_document_id, source_document_number, doc_date, due_date, reference, status, total, amount_paid, amount_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, 'draft', $9, 0, $9)
       RETURNING *`,
      [newDocType, number, existing.contact_id, existing.contact_name, existing.id, existing.number, todayStr, existing.number, existing.total]
    );

    const newDoc = newDocRes.rows[0];
    const newLines = [];
    for (const l of existingLines) {
      const lRes = await pool.query(
        `INSERT INTO document_lines (document_id, product_id, product_name, analytic_account_id, analytic_account_name, qty, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [newDoc.id, l.product_id, l.product_name, l.analytic_account_id, l.analytic_account_name, l.qty, l.unit_price, l.line_total]
      );
      newLines.push(lRes.rows[0]);
    }

    newDoc.lines = newLines;
    return ok(res, await shapeDoc(newDoc), 201);
  } catch (error) { next(error); }
};

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  confirmDocument,
  convertDocument
};

