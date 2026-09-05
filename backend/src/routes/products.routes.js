// backend/src/routes/products.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /products
router.get('/', (req, res) => {
  res.json({ data: store.products });
});

// GET /products/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const prod = store.products.find(p => p.id === id);
  if (!prod) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  }
  res.json({ data: prod });
});

// POST /products
router.post('/', requireRole('admin'), (req, res) => {
  const { name, type = 'goods', sales_price = 0, cost = 0, category = 'General' } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product name is required' } });
  }

  const newProd = {
    id: store.counters.product++,
    name,
    type,
    sales_price: parseFloat(sales_price) || 0,
    cost: parseFloat(cost) || 0,
    category
  };

  store.products.push(newProd);
  res.status(201).json({ data: newProd });
});

// PUT /products/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const idx = store.products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  }

  const existing = store.products[idx];
  const updated = {
    ...existing,
    ...req.body,
    sales_price: req.body.sales_price !== undefined ? parseFloat(req.body.sales_price) : existing.sales_price,
    cost: req.body.cost !== undefined ? parseFloat(req.body.cost) : existing.cost,
    id
  };
  store.products[idx] = updated;

  res.json({ data: updated });
});

module.exports = router;
