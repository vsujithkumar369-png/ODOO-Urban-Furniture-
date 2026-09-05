// backend/src/routes/analytics.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /analytics
router.get('/', (req, res) => {
  res.json({ data: store.analytics });
});

// POST /analytics
router.post('/', requireRole('admin'), (req, res) => {
  const { name, type = 'expense' } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
  }

  const newAcc = {
    id: store.counters.analytic++,
    name,
    type
  };
  store.analytics.push(newAcc);
  res.status(201).json({ data: newAcc });
});

// PUT /analytics/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const idx = store.analytics.findIndex(a => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analytic account not found' } });
  }

  const existing = store.analytics[idx];
  const updated = {
    ...existing,
    ...req.body,
    id
  };
  store.analytics[idx] = updated;
  res.json({ data: updated });
});

module.exports = router;
