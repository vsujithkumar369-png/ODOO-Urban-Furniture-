// backend/src/routes/budgets.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

function computeBudgetFields(budget) {
  if (budget.status !== 'confirmed') {
    return {
      ...budget,
      achieved_amount: 0,
      achieved_percent: 0,
      amount_to_achieve: budget.committed_amount
    };
  }

  // Find contributing documents
  let achieved = 0;
  store.documents.forEach(doc => {
    if (doc.status === 'confirmed' || doc.status === 'paid' || doc.status === 'partially_paid') {
      const isMatch = (budget.type === 'expense' && doc.doc_type === 'VENDOR_BILL') ||
                      (budget.type === 'income' && doc.doc_type === 'CUSTOMER_INVOICE');
      if (isMatch) {
        doc.lines.forEach(line => {
          if (line.analytic_account_id === budget.analytic_account_id) {
            achieved += line.line_total || 0;
          }
        });
      }
    }
  });

  const committed = budget.committed_amount || 0;
  const pct = committed > 0 ? parseFloat(((achieved / committed) * 100).toFixed(1)) : 0;
  const remaining = Math.max(0, committed - achieved);

  return {
    ...budget,
    achieved_amount: achieved,
    achieved_percent: pct,
    amount_to_achieve: remaining
  };
}

// GET /budgets
router.get('/', (req, res) => {
  const result = store.budgets.map(computeBudgetFields);
  res.json({ data: result });
});

// GET /budgets/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const b = store.budgets.find(b => b.id === id);
  if (!b) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
  }
  res.json({ data: computeBudgetFields(b) });
});

// GET /budgets/:id/achieved-documents
router.get('/:id/achieved-documents', (req, res) => {
  const id = parseInt(req.params.id);
  const budget = store.budgets.find(b => b.id === id);
  if (!budget) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
  }

  const docs = [];
  store.documents.forEach(doc => {
    if (doc.status === 'confirmed' || doc.status === 'paid' || doc.status === 'partially_paid') {
      const isMatch = (budget.type === 'expense' && doc.doc_type === 'VENDOR_BILL') ||
                      (budget.type === 'income' && doc.doc_type === 'CUSTOMER_INVOICE');
      if (isMatch) {
        let docSum = 0;
        doc.lines.forEach(line => {
          if (line.analytic_account_id === budget.analytic_account_id) {
            docSum += line.line_total || 0;
          }
        });
        if (docSum > 0) {
          docs.push({
            document_id: doc.id,
            number: doc.number,
            amount: docSum,
            doc_type: doc.doc_type
          });
        }
      }
    }
  });

  res.json({ data: docs });
});

// POST /budgets
router.post('/', requireRole('admin'), (req, res) => {
  const { name, start_date, end_date, analytic_account_id, type = 'expense', responsible, committed_amount } = req.body;
  if (!name || !start_date || !end_date || !analytic_account_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required budget fields' } });
  }

  const analytic = store.analytics.find(a => a.id === parseInt(analytic_account_id));
  const newBudget = {
    id: store.counters.budget++,
    name,
    start_date,
    end_date,
    analytic_account_id: parseInt(analytic_account_id),
    analytic_account_name: analytic ? analytic.name : '',
    type,
    responsible: responsible || req.user.name,
    committed_amount: parseFloat(committed_amount) || 0,
    achieved_amount: 0,
    achieved_percent: 0,
    amount_to_achieve: parseFloat(committed_amount) || 0,
    status: 'draft',
    revision_of_id: null
  };

  store.budgets.push(newBudget);
  res.status(201).json({ data: computeBudgetFields(newBudget) });
});

// PUT /budgets/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const idx = store.budgets.findIndex(b => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
  }

  const existing = store.budgets[idx];
  let analyticName = existing.analytic_account_name;
  if (req.body.analytic_account_id) {
    const analytic = store.analytics.find(a => a.id === parseInt(req.body.analytic_account_id));
    if (analytic) analyticName = analytic.name;
  }

  const updated = {
    ...existing,
    ...req.body,
    analytic_account_name: analyticName,
    committed_amount: req.body.committed_amount !== undefined ? parseFloat(req.body.committed_amount) : existing.committed_amount,
    id
  };
  store.budgets[idx] = updated;

  res.json({ data: computeBudgetFields(updated) });
});

// POST /budgets/:id/confirm
router.post('/:id/confirm', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const budget = store.budgets.find(b => b.id === id);
  if (!budget) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
  }

  budget.status = 'confirmed';
  res.json({ data: computeBudgetFields(budget) });
});

// POST /budgets/:id/revise
router.post('/:id/revise', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const budget = store.budgets.find(b => b.id === id);
  if (!budget) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
  }

  const revisedBudget = {
    ...budget,
    id: store.counters.budget++,
    name: `${budget.name} (Rev)`,
    status: 'draft',
    revision_of_id: budget.id
  };

  store.budgets.push(revisedBudget);
  res.status(201).json({ data: computeBudgetFields(revisedBudget) });
});

module.exports = router;
