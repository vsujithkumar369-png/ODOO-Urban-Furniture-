// backend/src/routes/documents.routes.js
const express = require('express');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
router.use(authenticateToken);

// GET /api/documents - List documents (Supports internal & portal contact users)
router.get('/', documentsController.getDocuments);

// GET /api/documents/:id - Get single document details
router.get('/:id', documentsController.getDocumentById);

// POST /api/documents - Create document (ADMIN & ACCOUNTANT)
router.post('/', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), documentsController.createDocument);

// PUT /api/documents/:id - Update draft document (ADMIN & ACCOUNTANT)
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), documentsController.updateDocument);

// POST /api/documents/:id/confirm - Confirm document & post journal entry (ADMIN & ACCOUNTANT)
router.post('/:id/confirm', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), documentsController.confirmDocument);

// POST /api/documents/:id/convert - Convert PO->Bill or SO->Invoice (ADMIN & ACCOUNTANT)
router.post('/:id/convert', requireRole([ROLES.ADMIN, ROLES.ACCOUNTANT]), documentsController.convertDocument);

module.exports = router;
