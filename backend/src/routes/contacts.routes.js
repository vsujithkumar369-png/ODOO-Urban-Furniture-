// backend/src/routes/contacts.routes.js
const express = require('express');
const { authenticateToken, requireRole, allowInternalUsers, ROLES } = require('../middleware/auth');
const contactsController = require('../controllers/contacts.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(allowInternalUsers);

// GET /api/contacts - List all contacts
router.get('/', contactsController.getContacts);

// GET /api/contacts/:id - Get single contact details
router.get('/:id', contactsController.getContactById);

// POST /api/contacts - Create contact (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), contactsController.createContact);

// PUT /api/contacts/:id - Update contact (ADMIN & ACCOUNTANT)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), contactsController.updateContact);

// DELETE /api/contacts/:id - Delete contact (ADMIN & ACCOUNTANT)
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), contactsController.deleteContact);

module.exports = router;
