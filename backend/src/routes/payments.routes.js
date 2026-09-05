// backend/src/routes/payments.routes.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const paymentsController = require('../controllers/payments.controller');

const router = express.Router();
router.use(authenticateToken);

// GET /api/payments - List payments
router.get('/', paymentsController.getPayments);

// POST /api/payments - Create payment (Supports internal users and portal contact users)
router.post('/', paymentsController.createPayment);

module.exports = router;
