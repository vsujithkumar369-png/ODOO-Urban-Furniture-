// backend/src/routes/analytics.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/analytics - List all analytic accounts
router.get('/', analyticsController.getAnalyticAccounts);

// GET /api/analytics/:id - Get single analytic account
router.get('/:id', analyticsController.getAnalyticAccountById);

// POST /api/analytics - Create analytic account (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), analyticsController.createAnalyticAccount);

// PUT /api/analytics/:id - Update analytic account (ADMIN & ACCOUNTANT)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), analyticsController.updateAnalyticAccount);

// DELETE /api/analytics/:id - Delete analytic account (ADMIN & ACCOUNTANT)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), analyticsController.deleteAnalyticAccount);

module.exports = router;
