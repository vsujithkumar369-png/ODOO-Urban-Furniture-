// backend/src/routes/journalEntries.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /journal-entries
router.get('/', async (req, res) => {
  const { journal_id, document_id } = req.query;

  try {
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

    const entryIds = result.rows.map(r => r.id);
    let allLines = [];
    if (entryIds.length > 0) {
      const linesRes = await pool.query('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ANY($1::int[]) ORDER BY id ASC', [entryIds]);
      allLines = linesRes.rows;
    }

    const entries = result.rows.map(entry => ({
      ...entry,
      lines: allLines.filter(l => l.journal_entry_id === entry.id).map(l => ({
        ...l,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0
      }))
    }));

    res.json({ data: entries });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch journal entries' } });
  }
});

// GET /journal-entries/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const entryRes = await pool.query('SELECT * FROM journal_entries WHERE id = $1', [id]);
    if (entryRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journal entry not found' } });
    }

    const entry = entryRes.rows[0];
    const linesRes = await pool.query('SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1 ORDER BY id ASC', [id]);

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
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch journal entry' } });
  }
});

module.exports = router;
