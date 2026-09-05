// backend/src/routes/reports.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const reportsController = require('../controllers/reports.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);
router.use(requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]));

// GET /api/reports/profit-loss - Generate Profit & Loss Report
router.get('/profit-loss', reportsController.getProfitLoss);

// GET /api/reports/balance-sheet - Generate Balance Sheet Report
router.get('/balance-sheet', reportsController.getBalanceSheet);

// GET /api/reports/budget-report - Generate Budget Report
router.get('/budget-report', reportsController.getBudgetReport);

module.exports = router;
