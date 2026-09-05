// backend/src/routes/products.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    const prods = result.rows.map(p => ({
      ...p,
      sales_price: parseFloat(p.sales_price) || 0,
      cost: parseFloat(p.cost) || 0
    }));
    res.json({ data: prods });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch products' } });
  }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    const p = result.rows[0];
    res.json({
      data: {
        ...p,
        sales_price: parseFloat(p.sales_price) || 0,
        cost: parseFloat(p.cost) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch product' } });
  }
});

// POST /products
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type = 'goods', sales_price = 0, cost = 0, category = 'General' } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product name is required' } });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, type, sales_price, cost, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, type, parseFloat(sales_price) || 0, parseFloat(cost) || 0, category]
    );
    const p = result.rows[0];
    res.status(201).json({
      data: {
        ...p,
        sales_price: parseFloat(p.sales_price) || 0,
        cost: parseFloat(p.cost) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create product' } });
  }
});

// PUT /products/:id
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type, sales_price, cost, category } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    const cur = existing.rows[0];
    const result = await pool.query(
      `UPDATE products SET
        name = $1, type = $2, sales_price = $3, cost = $4, category = $5
       WHERE id = $6 RETURNING *`,
      [
        name !== undefined ? name : cur.name,
        type !== undefined ? type : cur.type,
        sales_price !== undefined ? parseFloat(sales_price) : cur.sales_price,
        cost !== undefined ? parseFloat(cost) : cur.cost,
        category !== undefined ? category : cur.category,
        id
      ]
    );

    const p = result.rows[0];
    res.json({
      data: {
        ...p,
        sales_price: parseFloat(p.sales_price) || 0,
        cost: parseFloat(p.cost) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update product' } });
  }
});

module.exports = router;
