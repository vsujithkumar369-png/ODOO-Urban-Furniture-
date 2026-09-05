const express = require('express');
const { profitLoss, balanceSheet, budgetReport } = require('../controllers/reports.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/profit-loss', profitLoss);
router.get('/balance-sheet', balanceSheet);
router.get('/budget-report', budgetReport);

module.exports = router;
