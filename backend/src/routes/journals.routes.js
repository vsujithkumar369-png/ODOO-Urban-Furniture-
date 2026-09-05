// backend/src/routes/journals.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const journalsController = require('../controllers/journals.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/journals - List all journals
router.get('/', journalsController.getJournals);

// GET /api/journals/:id - Get single journal
router.get('/:id', journalsController.getJournalById);

// POST /api/journals - Create journal (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), journalsController.createJournal);

// PUT /api/journals/:id - Update journal (ADMIN & ACCOUNTANT)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), journalsController.updateJournal);

// DELETE /api/journals/:id - Delete journal (ADMIN & ACCOUNTANT)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), journalsController.deleteJournal);

module.exports = router;
