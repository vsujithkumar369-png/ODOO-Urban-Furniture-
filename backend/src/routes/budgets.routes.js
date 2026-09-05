const express = require('express');
const { getAll, getById, create, update, confirm, revise, achievedDocuments } = require('../controllers/budgets.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/confirm', confirm);
router.post('/:id/revise', revise);
router.get('/:id/achieved-documents', achievedDocuments);

module.exports = router;
