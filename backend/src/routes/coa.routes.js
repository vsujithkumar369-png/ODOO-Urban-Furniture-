// backend/src/routes/coa.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const coaController = require('../controllers/coa.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/coa - List all accounts
router.get('/', coaController.getAccounts);

// GET /api/coa/:id - Get single account details
router.get('/:id', coaController.getAccountById);

// POST /api/coa - Create account (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), coaController.createAccount);

// PUT /api/coa/:id - Update account (ADMIN & ACCOUNTANT)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), coaController.updateAccount);

// DELETE /api/coa/:id - Delete account (ADMIN & ACCOUNTANT)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), coaController.deleteAccount);

module.exports = router;
