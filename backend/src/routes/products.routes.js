// backend/src/routes/products.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const productsController = require('../controllers/products.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/products - List all products
router.get('/', productsController.getProducts);

// GET /api/products/:id - Get product details
router.get('/:id', productsController.getProductById);

// POST /api/products - Create product (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), productsController.createProduct);

// PUT /api/products/:id - Update product (ADMIN & ACCOUNTANT)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), productsController.updateProduct);

// DELETE /api/products/:id - Delete product (ADMIN & ACCOUNTANT)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), productsController.deleteProduct);

module.exports = router;
