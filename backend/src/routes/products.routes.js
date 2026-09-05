// backend/src/routes/products.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const { isNonNegativeNumber } = require('../middleware/validation');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// Helper function to format product response
function formatProduct(p) {
  return {
    id: p.id,
    name: p.name,
    type: (p.type || 'GOODS').toUpperCase(),
    sales_price: parseFloat(p.sales_price) || 0,
    cost: parseFloat(p.cost) || 0,
    category: p.category || 'General',
    image_url: p.image_url || null,
    created_at: p.created_at
  };
}

// GET /api/products
router.get('/', async (req, res) => {
  const { category, type } = req.query;
  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND LOWER(category) = LOWER($${params.length})`;
    }

    if (type) {
      params.push(type.toUpperCase());
      query += ` AND UPPER(type) = $${params.length}`;
    }

    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json({ data: result.rows.map(formatProduct) });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch products' } });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid product ID' } });
  }

  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    res.json({ data: formatProduct(result.rows[0]) });
  } catch (err) {
    console.error('Error fetching product by ID:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch product' } });
  }
});

// POST /api/products (Admin & Accountant)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const { name, type = 'GOODS', sales_price = 0, cost = 0, category = 'General', image_url, profile_image } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product name is required' } });
  }

  const normalizedType = (type || 'GOODS').toUpperCase();
  if (!['GOODS', 'SERVICE', 'COMBO'].includes(normalizedType)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product type must be GOODS, SERVICE, or COMBO' } });
  }

  const sPrice = parseFloat(sales_price);
  if (isNaN(sPrice) || sPrice < 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Sales price must be a non-negative number' } });
  }

  const cCost = parseFloat(cost);
  if (isNaN(cCost) || cCost < 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cost / purchase price must be a non-negative number' } });
  }

  const imageUrl = image_url || profile_image || null;

  try {
    // Application-level duplicate name check
    const existing = await pool.query('SELECT id FROM products WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product with this name already exists' } });
    }

    const result = await pool.query(
      `INSERT INTO products (name, type, sales_price, cost, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name.trim(), normalizedType, sPrice, cCost, category.trim() || 'General', imageUrl]
    );

    res.status(201).json({ data: formatProduct(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL Unique Constraint Violation
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product with this name already exists' } });
    }
    console.error('Error creating product:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create product' } });
  }
});

// PUT /api/products/:id (Admin & Accountant)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid product ID' } });
  }

  const { name, type, sales_price, cost, category, image_url, profile_image } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    const cur = existing.rows[0];

    let newName = cur.name;
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product name cannot be empty' } });
      }
      newName = name.trim();
      if (newName.toLowerCase() !== cur.name.toLowerCase()) {
        const nameCheck = await pool.query('SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND id != $2', [newName, id]);
        if (nameCheck.rows.length > 0) {
          return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product with this name already exists' } });
        }
      }
    }

    let newType = cur.type;
    if (type !== undefined) {
      const normalizedType = type.toUpperCase();
      if (!['GOODS', 'SERVICE', 'COMBO'].includes(normalizedType)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product type must be GOODS, SERVICE, or COMBO' } });
      }
      newType = normalizedType;
    }

    let newSalesPrice = cur.sales_price;
    if (sales_price !== undefined) {
      const sPrice = parseFloat(sales_price);
      if (isNaN(sPrice) || sPrice < 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Sales price must be a non-negative number' } });
      }
      newSalesPrice = sPrice;
    }

    let newCost = cur.cost;
    if (cost !== undefined) {
      const cCost = parseFloat(cost);
      if (isNaN(cCost) || cCost < 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cost / purchase price must be a non-negative number' } });
      }
      newCost = cCost;
    }

    const imageUrl = image_url !== undefined ? image_url : (profile_image !== undefined ? profile_image : cur.image_url);

    const result = await pool.query(
      `UPDATE products SET
        name = $1, type = $2, sales_price = $3, cost = $4, category = $5, image_url = $6
       WHERE id = $7 RETURNING *`,
      [
        newName,
        newType,
        newSalesPrice,
        newCost,
        category !== undefined ? (category.trim() || 'General') : cur.category,
        imageUrl,
        id
      ]
    );

    res.json({ data: formatProduct(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Product with this name already exists' } });
    }
    console.error('Error updating product:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update product' } });
  }
});

// DELETE /api/products/:id (Admin & Accountant - safe foreign key reference check)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid product ID' } });
  }

  try {
    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    // Check if referenced in document_lines before deleting to preserve transaction history
    const refCheck = await pool.query('SELECT id FROM document_lines WHERE product_id = $1 LIMIT 1', [id]);
    if (refCheck.rows.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Cannot delete product because it is referenced in transactions/documents.' }
      });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ data: { message: 'Product deleted successfully', id } });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete product' } });
  }
});

module.exports = router;
