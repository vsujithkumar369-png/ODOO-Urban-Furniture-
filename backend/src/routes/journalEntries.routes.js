// backend/src/routes/journalEntries.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const journalEntriesController = require('../controllers/journalEntries.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/journal-entries - List all journal entries
router.get('/', journalEntriesController.getJournalEntries);

// GET /api/journal-entries/:id - Get single journal entry
router.get('/:id', journalEntriesController.getJournalEntryById);

// POST /api/journal-entries - Create manual journal entry (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), journalEntriesController.createJournalEntry);

module.exports = router;
