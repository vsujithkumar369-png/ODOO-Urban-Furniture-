const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, 'backend', 'src');

// Helper to write file
const w = (fp, content) => fs.writeFileSync(fp, content, 'utf-8');

// ─────────────────────────────────────────────
// 1. vite.config.js — fix proxy port 3000 → 4000
// ─────────────────────────────────────────────
const vitePath = path.join(__dirname, 'frontend', 'vite.config.js');
w(vitePath, `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
`);
console.log('✅ vite.config.js — port fixed to 4000');

// ─────────────────────────────────────────────
// 2. backend/src/utils/errors.js — add ok() helper
// ─────────────────────────────────────────────
w(path.join(srcDir, 'utils', 'errors.js'), `// Error and response helpers for consistent API shape.
const errorResponse = (res, status, code, message) => {
  return res.status(status).json({ error: { code, message } });
};

// Wraps any payload in { data: ... } per contract
const ok = (res, data, status = 200) => {
  return res.status(status).json({ data });
};

module.exports = { errorResponse, ok };
`);
console.log('✅ utils/errors.js — added ok() helper');

// ─────────────────────────────────────────────
// 3. auth.controller.js — fix responses + validation
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'auth.controller.js'), `const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { errorResponse, ok } = require('../utils/errors');

const prisma = new PrismaClient();

const signup = async (req, res, next) => {
  try {
    const { name, login_id, email, password } = req.body;

    if (!name || !login_id || !email || !password) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, login_id, email and password are required');
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ login_id }, { email }] }
    });

    if (existingUser) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Login ID or Email already exists');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, login_id, email, password_hash, role: 'admin' }
    });

    return ok(res, { id: user.id, name: user.name, login_id: user.login_id, email: user.email, role: user.role }, 201);
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { login_id, password } = req.body;

    if (!login_id || !password) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'login_id and password are required');
    }

    const user = await prisma.user.findUnique({ where: { login_id } });

    if (!user) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid Login Id or Password');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid Login Id or Password');
    }

    const tokenPayload = { id: user.id, name: user.name, role: user.role, contact_id: user.contact_id };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    return ok(res, { token, user: tokenPayload });
  } catch (error) { next(error); }
};

module.exports = { signup, login };
`);
console.log('✅ auth.controller.js — fixed response envelope + validation');

// ─────────────────────────────────────────────
// 4. contacts.controller.js — envelope + auto-create user + validation
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'contacts.controller.js'), `const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { errorResponse, ok } = require('../utils/errors');

const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const data = await prisma.contact.findMany({ where: filter });
    return ok(res, data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.contact.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Contact not found');
    return ok(res, data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type, email, mobile, city, state, pincode, image_url } = req.body;
    if (!name || !type || !email) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, type and email are required');
    }

    const contact = await prisma.contact.create({
      data: { name, type, email, mobile, city, state, pincode, image_url }
    });

    // Auto-create a portal user for this contact
    const tempPassword = Math.random().toString(36).slice(-10) + 'A!1';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.create({
      data: {
        name: contact.name,
        login_id: email,
        email,
        password_hash,
        role: 'contact',
        contact_id: contact.id
      }
    }).catch(() => { /* ignore if login_id collision */ });

    return ok(res, { ...contact, portal_access_created: true }, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type, email, mobile, city, state, pincode, image_url } = req.body;
    const data = await prisma.contact.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type, email, mobile, city, state, pincode, image_url }
    });
    return ok(res, data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
`);
console.log('✅ contacts.controller.js — envelope + auto-user + validation');

// ─────────────────────────────────────────────
// 5. products.controller.js
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'products.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const data = await prisma.product.findMany();
    return ok(res, data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Product not found');
    return ok(res, data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type, sales_price, cost, category } = req.body;
    if (!name || !type) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name and type are required');
    const data = await prisma.product.create({ data: { name, type, sales_price, cost, category } });
    return ok(res, data, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type, sales_price, cost, category } = req.body;
    const data = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type, sales_price, cost, category }
    });
    return ok(res, data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
`);
console.log('✅ products.controller.js');

// ─────────────────────────────────────────────
// 6. coa.controller.js
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'coa.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const data = await prisma.chartOfAccount.findMany();
    return ok(res, data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.chartOfAccount.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Account not found');
    return ok(res, data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name and type are required');
    const data = await prisma.chartOfAccount.create({ data: { name, type } });
    return ok(res, data, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    const data = await prisma.chartOfAccount.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type }
    });
    return ok(res, data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
`);
console.log('✅ coa.controller.js');

// ─────────────────────────────────────────────
// 7. journals.controller.js
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'journals.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

const include = { default_account: true };

const getAll = async (req, res, next) => {
  try {
    const data = await prisma.journal.findMany({ include });
    const shaped = data.map(j => ({ ...j, default_account_name: j.default_account?.name }));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.journal.findUnique({ where: { id: parseInt(req.params.id) }, include });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Journal not found');
    return ok(res, { ...data, default_account_name: data.default_account?.name });
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type, default_account_id } = req.body;
    if (!name || !type || !default_account_id) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, type and default_account_id are required');
    const data = await prisma.journal.create({ data: { name, type, default_account_id }, include });
    return ok(res, { ...data, default_account_name: data.default_account?.name }, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type, default_account_id } = req.body;
    const data = await prisma.journal.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type, default_account_id },
      include
    });
    return ok(res, { ...data, default_account_name: data.default_account?.name });
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
`);
console.log('✅ journals.controller.js');

// ─────────────────────────────────────────────
// 8. analytics.controller.js
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'analytics.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const data = await prisma.analyticAccount.findMany();
    return ok(res, data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.analyticAccount.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', 'Analytic Account not found');
    return ok(res, data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return errorResponse(res, 400, 'VALIDATION_ERROR', 'name and type are required');
    const data = await prisma.analyticAccount.create({ data: { name, type } });
    return ok(res, data, 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    const data = await prisma.analyticAccount.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type }
    });
    return ok(res, data);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update };
`);
console.log('✅ analytics.controller.js');

// ─────────────────────────────────────────────
// 9. budgets.controller.js — with computed fields + achieved-documents route
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'budgets.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

async function computeAchieved(budget) {
  const lines = await prisma.documentLine.findMany({
    where: {
      analytic_account_id: budget.analytic_account_id,
      document: {
        status: { in: ['confirmed', 'paid'] },
        doc_date: { gte: budget.start_date, lte: budget.end_date }
      }
    }
  });
  const achieved_amount = lines.reduce((s, l) => s + parseFloat(l.line_total), 0);
  const committed = parseFloat(budget.committed_amount);
  const achieved_percent = committed > 0 ? (achieved_amount / committed) * 100 : 0;
  const amount_to_achieve = Math.max(committed - achieved_amount, 0);
  return { achieved_amount, achieved_percent, amount_to_achieve };
}

async function shapeBudget(b) {
  const computed = await computeAchieved(b);
  const analytic = await prisma.analyticAccount.findUnique({ where: { id: b.analytic_account_id } });
  return {
    ...b,
    committed_amount: parseFloat(b.committed_amount),
    analytic_account_name: analytic?.name,
    type: analytic?.type,
    ...computed
  };
}

const getAll = async (req, res, next) => {
  try {
    const budgets = await prisma.budget.findMany();
    const shaped = await Promise.all(budgets.map(shapeBudget));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const b = await prisma.budget.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!b) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { name, start_date, end_date, analytic_account_id, committed_amount, revision_of_id } = req.body;
    if (!name || !start_date || !end_date || !analytic_account_id || committed_amount === undefined) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name, start_date, end_date, analytic_account_id and committed_amount are required');
    }
    const b = await prisma.budget.create({
      data: { name, start_date: new Date(start_date), end_date: new Date(end_date), analytic_account_id, committed_amount, status: 'draft', revision_of_id }
    });
    return ok(res, await shapeBudget(b), 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const { name, start_date, end_date, analytic_account_id, committed_amount } = req.body;
    const b = await prisma.budget.update({
      where: { id: parseInt(req.params.id) },
      data: { name, start_date: start_date ? new Date(start_date) : undefined, end_date: end_date ? new Date(end_date) : undefined, analytic_account_id, committed_amount }
    });
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const confirm = async (req, res, next) => {
  try {
    const b = await prisma.budget.update({ where: { id: parseInt(req.params.id) }, data: { status: 'confirmed' } });
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const revise = async (req, res, next) => {
  try {
    const b = await prisma.budget.update({ where: { id: parseInt(req.params.id) }, data: { status: 'revised' } });
    return ok(res, await shapeBudget(b));
  } catch (error) { next(error); }
};

const achievedDocuments = async (req, res, next) => {
  try {
    const budget = await prisma.budget.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!budget) return errorResponse(res, 404, 'NOT_FOUND', 'Budget not found');

    const lines = await prisma.documentLine.findMany({
      where: {
        analytic_account_id: budget.analytic_account_id,
        document: {
          status: { in: ['confirmed', 'paid'] },
          doc_date: { gte: budget.start_date, lte: budget.end_date }
        }
      },
      include: { document: true }
    });

    const docs = lines.map(l => ({
      document_id: l.document_id,
      number: l.document.number,
      amount: parseFloat(l.line_total),
      doc_type: l.document.doc_type
    }));

    return ok(res, docs);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update, confirm, revise, achievedDocuments };
`);
console.log('✅ budgets.controller.js — with computed fields + achievedDocuments');

// ─────────────────────────────────────────────
// 10. budgets.routes.js — add achievedDocuments route
// ─────────────────────────────────────────────
w(path.join(srcDir, 'routes', 'budgets.routes.js'), `const express = require('express');
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
`);
console.log('✅ budgets.routes.js — added achieved-documents route');

// ─────────────────────────────────────────────
// 11. documents.controller.js — add computed fields + envelope
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'documents.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const { postDocument } = require('../services/postingEngine');
const prisma = new PrismaClient();

const generateNumber = async (docType) => {
  const count = await prisma.document.count({ where: { doc_type: docType } });
  const num = (count + 1).toString().padStart(4, '0');
  const year = new Date().getFullYear();
  if (docType === 'PO') return \`PO/\${year}/\${num}\`;
  if (docType === 'VENDOR_BILL') return \`BILL/\${year}/\${num}\`;
  if (docType === 'SO') return \`SO/\${year}/\${num}\`;
  if (docType === 'CUSTOMER_INVOICE') return \`INV/\${year}/\${num}\`;
  return \`DOC/\${year}/\${num}\`;
};

async function shapeDoc(doc) {
  const total = parseFloat(doc.total);
  const amount_paid = parseFloat(doc.amount_paid);
  const contact = doc.contact || (doc.contact_id ? await prisma.contact.findUnique({ where: { id: doc.contact_id } }) : null);
  const sourceDoc = doc.source_document_id
    ? await prisma.document.findUnique({ where: { id: doc.source_document_id }, select: { number: true } })
    : null;
  const lines = (doc.lines || []).map(l => ({
    ...l,
    qty: parseFloat(l.qty),
    unit_price: parseFloat(l.unit_price),
    line_total: parseFloat(l.line_total)
  }));
  return {
    ...doc,
    total,
    amount_paid,
    amount_due: total - amount_paid,
    contact_name: contact?.name ?? null,
    source_document_number: sourceDoc?.number ?? null,
    lines
  };
}

const getAll = async (req, res, next) => {
  try {
    const { doc_type, contact_id, status } = req.query;
    const filter = {};
    if (doc_type) filter.doc_type = doc_type;
    if (contact_id) filter.contact_id = parseInt(contact_id);
    if (status) filter.status = status;
    if (req.user.role === 'contact') {
      filter.doc_type = 'CUSTOMER_INVOICE';
      filter.contact_id = req.user.contact_id;
    }
    const docs = await prisma.document.findMany({ where: filter, include: { lines: true, contact: true } });
    const shaped = await Promise.all(docs.map(shapeDoc));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { lines: { include: { product: true, analytic_account: true } }, contact: true }
    });
    if (!doc) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (req.user.role === 'contact') {
      if (doc.doc_type !== 'CUSTOMER_INVOICE' || doc.contact_id !== req.user.contact_id) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied');
      }
    }
    const shaped = await shapeDoc(doc);
    // Add line-level names
    shaped.lines = shaped.lines.map((l, i) => ({
      ...l,
      product_name: doc.lines[i]?.product?.name ?? null,
      analytic_account_name: doc.lines[i]?.analytic_account?.name ?? null
    }));
    return ok(res, shaped);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { doc_type, contact_id, doc_date, due_date, reference, lines } = req.body;
    if (!doc_type || !contact_id) return errorResponse(res, 400, 'VALIDATION_ERROR', 'doc_type and contact_id are required');

    const number = await generateNumber(doc_type);
    let total = 0;
    const processedLines = (lines || []).map(line => {
      const qty = parseFloat(line.qty) || 0;
      const unit_price = parseFloat(line.unit_price) || 0;
      const line_total = qty * unit_price;
      total += line_total;
      return { product_id: line.product_id, analytic_account_id: line.analytic_account_id || null, qty, unit_price, line_total };
    });

    const doc = await prisma.document.create({
      data: { doc_type, number, contact_id, doc_date: doc_date ? new Date(doc_date) : new Date(), due_date: due_date ? new Date(due_date) : new Date(), reference, status: 'draft', total, amount_paid: 0, lines: { create: processedLines } },
      include: { lines: true, contact: true }
    });
    return ok(res, await shapeDoc(doc), 201);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const existing = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (existing.status !== 'draft') return errorResponse(res, 400, 'BAD_REQUEST', 'Only draft documents can be updated');
    const { doc_type, contact_id, doc_date, due_date, reference } = req.body;
    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: { contact_id, doc_date: doc_date ? new Date(doc_date) : undefined, due_date: due_date ? new Date(due_date) : undefined, reference },
      include: { lines: true, contact: true }
    });
    return ok(res, await shapeDoc(doc));
  } catch (error) { next(error); }
};

const confirm = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existing = await prisma.document.findUnique({ where: { id: docId } });
    if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (existing.status !== 'draft') return errorResponse(res, 400, 'BAD_REQUEST', 'Only draft documents can be confirmed');

    if (['PO', 'SO'].includes(existing.doc_type)) {
      await prisma.document.update({ where: { id: docId }, data: { status: 'confirmed' } });
      const updated = await prisma.document.findUnique({ where: { id: docId }, include: { lines: true, contact: true } });
      return ok(res, await shapeDoc(updated));
    } else {
      try {
        const journalEntry = await postDocument(docId);
        const updated = await prisma.document.findUnique({ where: { id: docId }, include: { lines: true, contact: true } });
        const shaped = await shapeDoc(updated);
        return ok(res, { ...shaped, journal_entry_id: journalEntry.id });
      } catch (postError) {
        return errorResponse(res, 500, 'POSTING_ERROR', postError.message);
      }
    }
  } catch (error) { next(error); }
};

const convert = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existing = await prisma.document.findUnique({ where: { id: docId }, include: { lines: true } });
    if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (existing.status !== 'confirmed') return errorResponse(res, 400, 'BAD_REQUEST', 'Document must be confirmed to convert');
    let newDocType;
    if (existing.doc_type === 'PO') newDocType = 'VENDOR_BILL';
    else if (existing.doc_type === 'SO') newDocType = 'CUSTOMER_INVOICE';
    else return errorResponse(res, 400, 'BAD_REQUEST', 'Cannot convert this document type');
    const number = await generateNumber(newDocType);
    const newDoc = await prisma.document.create({
      data: {
        doc_type: newDocType, number, contact_id: existing.contact_id, source_document_id: existing.id,
        doc_date: new Date(), due_date: new Date(), reference: existing.number, status: 'draft',
        total: existing.total, amount_paid: 0,
        lines: { create: existing.lines.map(l => ({ product_id: l.product_id, analytic_account_id: l.analytic_account_id, qty: l.qty, unit_price: l.unit_price, line_total: l.line_total })) }
      },
      include: { lines: true, contact: true }
    });
    return ok(res, await shapeDoc(newDoc), 201);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update, confirm, convert };
`);
console.log('✅ documents.controller.js — envelope + computed fields');

// ─────────────────────────────────────────────
// 12. payments.controller.js — envelope
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'payments.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const { recordPayment } = require('../services/postingEngine');
const prisma = new PrismaClient();

const create = async (req, res, next) => {
  try {
    const { document_id, direction, amount, pay_date, method, note } = req.body;
    if (!document_id || !direction || amount === undefined || !method) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'document_id, direction, amount and method are required');
    }
    const doc = await prisma.document.findUnique({ where: { id: parseInt(document_id) } });
    if (!doc) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (req.user.role === 'contact') {
      if (doc.doc_type !== 'CUSTOMER_INVOICE' || doc.contact_id !== req.user.contact_id || direction !== 'receive') {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied to pay this document');
      }
    }
    try {
      const result = await recordPayment(parseInt(document_id), direction, amount, method, pay_date, note);
      return ok(res, { id: result.payment.id, document_id: parseInt(document_id), amount: parseFloat(result.payment.amount), journal_entry_id: result.payment.journal_entry_id }, 201);
    } catch (e) {
      if (e.code === 'VALIDATION_ERROR') return errorResponse(res, 400, 'VALIDATION_ERROR', e.message);
      throw e;
    }
  } catch (error) { next(error); }
};

const getByDocumentId = async (req, res, next) => {
  try {
    const { document_id } = req.query;
    if (!document_id) return errorResponse(res, 400, 'BAD_REQUEST', 'document_id query parameter is required');
    const doc = await prisma.document.findUnique({ where: { id: parseInt(document_id) } });
    if (!doc) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');
    if (req.user.role === 'contact') {
      if (doc.doc_type !== 'CUSTOMER_INVOICE' || doc.contact_id !== req.user.contact_id) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied');
      }
    }
    const payments = await prisma.payment.findMany({ where: { document_id: parseInt(document_id) } });
    return ok(res, payments.map(p => ({ ...p, amount: parseFloat(p.amount) })));
  } catch (error) { next(error); }
};

module.exports = { create, getByDocumentId };
`);
console.log('✅ payments.controller.js — envelope + validation');

// ─────────────────────────────────────────────
// 13. journalEntries.controller.js — envelope
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'journalEntries.controller.js'), `const { PrismaClient } = require('@prisma/client');
const { errorResponse, ok } = require('../utils/errors');
const prisma = new PrismaClient();

function shapeEntry(e) {
  return {
    ...e,
    journal_name: e.journal?.name ?? null,
    lines: (e.lines || []).map(l => ({
      ...l,
      account_name: l.account?.name ?? null,
      debit: parseFloat(l.debit),
      credit: parseFloat(l.credit)
    }))
  };
}

const getAll = async (req, res, next) => {
  try {
    const { journal_id, document_id } = req.query;
    const filter = {};
    if (journal_id) filter.journal_id = parseInt(journal_id);
    if (document_id) filter.document_id = parseInt(document_id);
    const entries = await prisma.journalEntry.findMany({
      where: filter,
      include: { journal: true, lines: { include: { account: true } } }
    });
    return ok(res, entries.map(shapeEntry));
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { journal: true, lines: { include: { account: true } } }
    });
    if (!entry) return errorResponse(res, 404, 'NOT_FOUND', 'Journal Entry not found');
    return ok(res, shapeEntry(entry));
  } catch (error) { next(error); }
};

module.exports = { getAll, getById };
`);
console.log('✅ journalEntries.controller.js — envelope + journal_name');

// ─────────────────────────────────────────────
// 14. reports.controller.js — envelope
// ─────────────────────────────────────────────
w(path.join(srcDir, 'controllers', 'reports.controller.js'), `const { errorResponse, ok } = require('../utils/errors');
const { getProfitLoss, getBalanceSheet, getBudgetReport } = require('../services/reportQueries');

const profitLoss = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const result = await getProfitLoss(year);
    return ok(res, { year: parseInt(year), ...result });
  } catch (error) { next(error); }
};

const balanceSheet = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const result = await getBalanceSheet(year);
    return ok(res, { year: parseInt(year), ...result });
  } catch (error) { next(error); }
};

const budgetReport = async (req, res, next) => {
  try {
    const result = await getBudgetReport();
    return ok(res, result);
  } catch (error) { next(error); }
};

module.exports = { profitLoss, balanceSheet, budgetReport };
`);
console.log('✅ reports.controller.js — envelope');

// ─────────────────────────────────────────────
// 15. .env.example — add JWT_SECRET
// ─────────────────────────────────────────────
w(path.join(__dirname, 'backend', '.env.example'), `PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/urban_furniture
JWT_SECRET=your_super_secret_key_here
`);
console.log('✅ .env.example — updated with JWT_SECRET');

// ─────────────────────────────────────────────
// 16. AuthContext.jsx — remove dead accountant role
// ─────────────────────────────────────────────
w(path.join(__dirname, 'frontend', 'src', 'context', 'AuthContext.jsx'), `import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uf-user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('uf-token') || null);

  const login = useCallback((tok, userData) => {
    setToken(tok);
    setUser(userData);
    localStorage.setItem('uf-token', tok);
    localStorage.setItem('uf-user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('uf-token');
    localStorage.removeItem('uf-user');
  }, []);

  const isAdmin   = user?.role === 'admin';
  const isContact = user?.role === 'contact';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isContact }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
`);
console.log('✅ AuthContext.jsx — removed dead accountant role');

console.log('\n🎉 All fixes applied!');
