const { pool } = require('../db');
const { errorResponse, ok } = require('../utils/errors');

const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    return ok(res, result.rows);
  } catch (error) { next(error); }
};

const getProductById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Product not found');
    return ok(res, result.rows[0]);
  } catch (error) { next(error); }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, type, sales_price, cost, category, image_url } = req.body;
    if (!name || !type) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name and type are required');
    const result = await pool.query(
      `INSERT INTO products (name, type, sales_price, cost, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, type, sales_price || 0, cost || 0, category || 'General', image_url || null]
    );
    return ok(res, result.rows[0], 201);
  } catch (error) { next(error); }
};

const updateProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type, sales_price, cost, category, image_url } = req.body;
    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           sales_price = COALESCE($3, sales_price),
           cost = COALESCE($4, cost),
           category = COALESCE($5, category),
           image_url = COALESCE($6, image_url)
       WHERE id = $7
       RETURNING *`,
      [name, type, sales_price, cost, category, image_url, id]
    );
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Product not found');
    return ok(res, result.rows[0]);
  } catch (error) { next(error); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const delRes = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (delRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Product not found');
    return ok(res, { id, deleted: true });
  } catch (error) { next(error); }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };

