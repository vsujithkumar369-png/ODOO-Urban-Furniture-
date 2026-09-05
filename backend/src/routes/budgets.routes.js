// backend/src/routes/budgets.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const budgetsController = require('../controllers/budgets.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/budgets - List all budgets
router.get('/', budgetsController.getBudgets);

// GET /api/budgets/:id - Get single budget details
router.get('/:id', budgetsController.getBudgetById);

// GET /api/budgets/:id/achieved-documents - Drill down transaction lines
router.get('/:id/achieved-documents', budgetsController.getAchievedDocuments);

// POST /api/budgets - Create budget (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), budgetsController.createBudget);

// PUT /api/budgets/:id - Update budget (ADMIN & ACCOUNTANT)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), budgetsController.updateBudget);

// POST /api/budgets/:id/confirm - Confirm budget (ADMIN & ACCOUNTANT)
router.post('/:id/confirm', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), budgetsController.confirmBudget);

// POST /api/budgets/:id/revise - Revise budget (ADMIN & ACCOUNTANT)
router.post('/:id/revise', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), budgetsController.reviseBudget);

module.exports = router;
