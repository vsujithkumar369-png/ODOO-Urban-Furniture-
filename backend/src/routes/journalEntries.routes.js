// backend/src/routes/journalEntries.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /journal-entries
router.get('/', (req, res) => {
  const { journal_id, document_id } = req.query;
  let list = store.journalEntries;

  if (journal_id) {
    list = list.filter(e => e.journal_id === parseInt(journal_id));
  }
  if (document_id) {
    list = list.filter(e => e.document_id === parseInt(document_id));
  }

  res.json({ data: list });
});

// GET /journal-entries/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const entry = store.journalEntries.find(e => e.id === id);
  if (!entry) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journal entry not found' } });
  }
  res.json({ data: entry });
});

module.exports = router;
