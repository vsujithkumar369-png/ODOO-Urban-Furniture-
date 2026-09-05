// backend/src/routes/journalEntries.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, allowInternalUsers } = require('../middleware/auth');
const { isValidId } = require('../middleware/validation');

const router = express.Router();
router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /journal-entries - list journal entries
router.get('/', async (req, res) => {
  const { journal_id, document_id } = req.query;

  try {
    let query = 'SELECT * FROM journal_entries WHERE 1=1';
    const params = [];

    if (journal_id) {
      if (isValidId(journal_id)) {
        params.push(parseInt(journal_id, 10));
        query += ` AND journal_id = $${params.length}`;
      }
    }
    if (document_id) {
      if (isValidId(document_id)) {
        params.push(parseInt(document_id, 10));
        query += ` AND document_id = $${params.length}`;
      }
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);

    const entryIds = result.rows.map(r => r.id);
    let allLines = [];
    if (entryIds.length > 0) {
      const linesRes = await pool.query(
        'SELECT * FROM journal_entry_lines WHERE journal_entry_id = ANY($1::int[]) ORDER BY id ASC',
        [entryIds]
      );
      allLines = linesRes.rows;
    }

    const entries = result.rows.map(entry => ({
      ...entry,
      lines: allLines
        .filter(l => l.journal_entry_id === entry.id)
        .map(l => ({
          ...l,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0
        }))
    }));

    res.json({ data: entries });
  } catch (err) {
    console.error('Error fetching journal entries:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch journal entries' } });
  }
});

// GET /journal-entries/:id - single entry with lines
router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid journal entry ID' } });
  }

  const id = parseInt(req.params.id, 10);
  try {
    const entryRes = await pool.query('SELECT * FROM journal_entries WHERE id = $1', [id]);
    if (entryRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journal entry not found' } });
    }

    const entry = entryRes.rows[0];
    const linesRes = await pool.query(
      'SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1 ORDER BY id ASC',
      [id]
    );

    res.json({
      data: {
        ...entry,
        lines: linesRes.rows.map(l => ({
          ...l,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching journal entry:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch journal entry' } });
  }
});

module.exports = router;
