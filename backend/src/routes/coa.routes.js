// backend/src/routes/coa.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /coa
router.get('/', (req, res) => {
  res.json({ data: store.coa });
});

// POST /coa
router.post('/', requireRole('admin'), (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name and type are required' } });
  }

  const validTypes = ['asset', 'liability', 'capital', 'income', 'expense'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Type must be one of: ${validTypes.join(', ')}` } });
  }

  const newAccount = {
    id: store.counters.coa++,
    name,
    type
  };
  store.coa.push(newAccount);
  res.status(201).json({ data: newAccount });
});

// PUT /coa/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const idx = store.coa.findIndex(a => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found' } });
  }

  const existing = store.coa[idx];
  const updated = {
    ...existing,
    ...req.body,
    id
  };
  store.coa[idx] = updated;
  res.json({ data: updated });
});

module.exports = router;
