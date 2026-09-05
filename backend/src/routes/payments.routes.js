const express = require('express');
const { create, getByDocumentId } = require('../controllers/payments.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Require authenticate
router.use(authenticate);

// contact-role users can only pay their own CUSTOMER_INVOICE docs (enforced in controller)
router.post('/', create);
router.get('/', getByDocumentId);

module.exports = router;
