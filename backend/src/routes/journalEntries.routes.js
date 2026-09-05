const express = require('express');
const { getAll, getById } = require('../controllers/journalEntries.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', getAll);
router.get('/:id', getById);

module.exports = router;
