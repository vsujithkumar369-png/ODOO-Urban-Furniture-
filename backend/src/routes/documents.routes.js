const express = require('express');
const { getAll, getById, create, update, confirm, convert } = require('../controllers/documents.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET routes available to admin and contact roles
router.get('/', getAll);
router.get('/:id', getById);

// Everything else admin only
router.use(requireRole('admin'));
router.post('/', create);
router.put('/:id', update);
router.post('/:id/confirm', confirm);
router.post('/:id/convert', convert);

module.exports = router;
