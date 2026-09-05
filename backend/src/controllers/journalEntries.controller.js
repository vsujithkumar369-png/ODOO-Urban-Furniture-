const { pool } = require('../db');
const { errorResponse, ok } = require('../utils/errors');

async function shapeEntry(e) {
  let journalName = e.journal_name;
  if (!journalName && e.journal_id) {
    const jRes = await pool.query('SELECT name FROM journals WHERE id = $1', [e.journal_id]);
    if (jRes.rows.length > 0) journalName = jRes.rows[0].name;
  }

  let lines = e.lines;
  if (!lines && e.id) {
    const lRes = await pool.query(
      `SELECT jel.*, a.name AS account_name
       FROM journal_entry_lines jel
       LEFT JOIN accounts a ON jel.account_id = a.id
       WHERE jel.journal_entry_id = $1
       ORDER BY jel.id ASC`,
      [e.id]
    );
    lines = lRes.rows;
  }

  const shapedLines = (lines || []).map(l => ({
    ...l,
    account_name: l.account_name || null,
    debit: parseFloat(l.debit || 0),
    credit: parseFloat(l.credit || 0)
  }));

  return {
    ...e,
    journal_name: journalName,
    lines: shapedLines
  };
}

const getJournalEntries = async (req, res, next) => {
  try {
    const { journal_id, document_id } = req.query;
    let query = 'SELECT * FROM journal_entries WHERE 1=1';
    const params = [];

    if (journal_id) {
      params.push(parseInt(journal_id));
      query += ` AND journal_id = $${params.length}`;
    }
    if (document_id) {
      params.push(parseInt(document_id));
      query += ` AND document_id = $${params.length}`;
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    const shaped = await Promise.all(result.rows.map(shapeEntry));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getJournalEntryById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const entryRes = await pool.query('SELECT * FROM journal_entries WHERE id = $1', [id]);
    if (entryRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Journal Entry not found');
    const entry = entryRes.rows[0];

    const linesRes = await pool.query(
      `SELECT jel.*, a.name AS account_name
       FROM journal_entry_lines jel
       LEFT JOIN accounts a ON jel.account_id = a.id
       WHERE jel.journal_entry_id = $1
       ORDER BY jel.id ASC`,
      [id]
    );
    entry.lines = linesRes.rows;
    return ok(res, await shapeEntry(entry));
  } catch (error) { next(error); }
};

const createJournalEntry = async (req, res, next) => {
  try {
    const { journal_id, entry_date, reference, lines } = req.body;
    if (!journal_id || !lines || !Array.isArray(lines) || lines.length < 2) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'journal_id and at least 2 entry lines are required');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const processedLines = lines.map(l => {
      const debit = parseFloat(l.debit || 0);
      const credit = parseFloat(l.credit || 0);
      totalDebit += debit;
      totalCredit += credit;
      return {
        account_id: l.account_id,
        contact_id: l.contact_id || null,
        debit,
        credit
      };
    });

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', `Unbalanced Entry: Total Debit (${totalDebit}) must equal Total Credit (${totalCredit})`);
    }

    const jRes = await pool.query('SELECT name FROM journals WHERE id = $1', [journal_id]);
    const journalName = jRes.rows.length > 0 ? jRes.rows[0].name : null;
    const dateStr = entry_date || new Date().toISOString().split('T')[0];

    const entryRes = await pool.query(
      `INSERT INTO journal_entries (journal_id, journal_name, entry_date, reference, status)
       VALUES ($1, $2, $3, $4, 'posted')
       RETURNING *`,
      [journal_id, journalName, dateStr, reference || null]
    );
    const entry = entryRes.rows[0];

    const insertedLines = [];
    for (const pl of processedLines) {
      const aRes = await pool.query('SELECT name FROM accounts WHERE id = $1', [pl.account_id]);
      const accName = aRes.rows.length > 0 ? aRes.rows[0].name : null;

      const lRes = await pool.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [entry.id, pl.account_id, accName, pl.contact_id, pl.debit, pl.credit]
      );
      insertedLines.push(lRes.rows[0]);
    }

    entry.lines = insertedLines;
    return ok(res, await shapeEntry(entry), 201);
  } catch (error) { next(error); }
};

module.exports = {
  getJournalEntries,
  getJournalEntryById,
  createJournalEntry
};

