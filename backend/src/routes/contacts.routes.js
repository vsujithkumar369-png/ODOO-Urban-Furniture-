// backend/src/routes/contacts.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /contacts
router.get('/', (req, res) => {
  const { type } = req.query;
  let list = store.contacts;
  if (type) {
    list = list.filter(c => c.type === type || c.type === 'both');
  }
  res.json({ data: list });
});

// GET /contacts/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const contact = store.contacts.find(c => c.id === id);
  if (!contact) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
  }
  res.json({ data: contact });
});

// POST /contacts
router.post('/', requireRole('admin'), (req, res) => {
  const { name, type = 'customer', email, mobile, city, state, pincode, image_url = null } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contact name is required' } });
  }

  const newContact = {
    id: store.counters.contact++,
    name,
    type,
    email: email || '',
    mobile: mobile || '',
    city: city || '',
    state: state || '',
    pincode: pincode || '',
    image_url
  };

  store.contacts.push(newContact);

  // Auto-create portal user if email provided
  if (email && !store.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    store.users.push({
      id: store.counters.user++,
      name,
      login_id: email,
      email,
      password: 'portal123',
      role: 'contact',
      contact_id: newContact.id
    });
  }

  res.status(201).json({ data: newContact });
});

// PUT /contacts/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const idx = store.contacts.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
  }

  const existing = store.contacts[idx];
  const updated = {
    ...existing,
    ...req.body,
    id // keep same id
  };
  store.contacts[idx] = updated;

  res.json({ data: updated });
});

module.exports = router;
