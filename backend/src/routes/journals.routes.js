// backend/src/routes/journals.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /journals
router.get('/', (req, res) => {
  res.json({ data: store.journals });
});

// POST /journals
router.post('/', requireRole('admin'), (req, res) => {
  const { name, type, default_account_id } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name and type are required' } });
  }

  const defaultAcc = store.coa.find(a => a.id === parseInt(default_account_id));
  const newJournal = {
    id: store.counters.journal++,
    name,
    type,
    default_account_id: defaultAcc ? defaultAcc.id : null,
    default_account_name: defaultAcc ? defaultAcc.name : null
  };

  store.journals.push(newJournal);
  res.status(201).json({ data: newJournal });
});

// PUT /journals/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const idx = store.journals.findIndex(j => j.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Journal not found' } });
  }

  const existing = store.journals[idx];
  let defaultAccName = existing.default_account_name;
  if (req.body.default_account_id !== undefined) {
    const acc = store.coa.find(a => a.id === parseInt(req.body.default_account_id));
    defaultAccName = acc ? acc.name : null;
  }

  const updated = {
    ...existing,
    ...req.body,
    default_account_name: defaultAccName,
    id
  };
  store.journals[idx] = updated;
  res.json({ data: updated });
});

module.exports = router;
