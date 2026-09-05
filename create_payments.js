const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'backend', 'src');

// 1. Update postingEngine.js
const postingEnginePath = path.join(srcDir, 'services', 'postingEngine.js');
let postingEngineContent = fs.readFileSync(postingEnginePath, 'utf-8');
postingEngineContent = postingEngineContent.replace('module.exports = { postDocument };', '');

postingEngineContent += `
const recordPayment = async (documentId, direction, amount, method, pay_date, note) => {
  return await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');
    if (doc.status !== 'confirmed') throw new Error('Document must be confirmed to record payment');

    const amountFloat = parseFloat(amount);
    const total = parseFloat(doc.total);
    const amountPaid = parseFloat(doc.amount_paid);
    const amountDue = total - amountPaid;

    // Use tiny epsilon for float comparison to avoid issues, or round to 2 decimals
    if (amountFloat > amountDue + 0.0001) {
      const err = new Error('Amount exceeds amount due');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const journalType = method === 'bank' ? 'bank' : 'cash';
    const journal = await tx.journal.findFirst({ where: { type: journalType } });
    if (!journal) throw new Error('Missing journal for payment method');

    const bankOrCashAcc = await tx.chartOfAccount.findFirst({ where: { name: method === 'bank' ? 'Bank' : 'Cash' } });
    const creditorsAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Creditors' } });
    const debtorsAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Debtors' } });

    if (!bankOrCashAcc || !creditorsAcc || !debtorsAcc) throw new Error('Missing necessary chart of accounts');

    let debitAccountId, creditAccountId;
    let setContactOnDebit = false, setContactOnCredit = false;

    if (direction === 'send') {
      debitAccountId = creditorsAcc.id;
      creditAccountId = bankOrCashAcc.id;
      setContactOnDebit = true;
    } else if (direction === 'receive') {
      debitAccountId = bankOrCashAcc.id;
      creditAccountId = debtorsAcc.id;
      setContactOnCredit = true;
    } else {
      throw new Error('Invalid payment direction');
    }

    const journalEntry = await tx.journalEntry.create({
      data: {
        journal_id: journal.id,
        document_id: doc.id,
        entry_date: pay_date ? new Date(pay_date) : new Date(),
        reference: \`Payment for \${doc.number}\`,
        status: 'posted',
        lines: {
          create: [
            {
              account_id: debitAccountId,
              contact_id: setContactOnDebit ? doc.contact_id : null,
              debit: amountFloat,
              credit: 0
            },
            {
              account_id: creditAccountId,
              contact_id: setContactOnCredit ? doc.contact_id : null,
              debit: 0,
              credit: amountFloat
            }
          ]
        }
      }
    });

    const payment = await tx.payment.create({
      data: {
        document_id: doc.id,
        direction,
        amount: amountFloat,
        pay_date: pay_date ? new Date(pay_date) : new Date(),
        method,
        note,
        journal_entry_id: journalEntry.id
      }
    });

    const newAmountPaid = amountPaid + amountFloat;
    // Round to avoid float precision issues
    const isPaid = (newAmountPaid + 0.0001) >= total;
    const newStatus = isPaid ? 'paid' : doc.status;

    await tx.document.update({
      where: { id: doc.id },
      data: { amount_paid: newAmountPaid, status: newStatus }
    });

    return { payment, document_status: newStatus };
  });
};

module.exports = { postDocument, recordPayment };
`;
fs.writeFileSync(postingEnginePath, postingEngineContent);

// 2. Write payments.controller.js
const controllerContent = `const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/errors');
const { recordPayment } = require('../services/postingEngine');
const prisma = new PrismaClient();

const create = async (req, res, next) => {
  try {
    const { document_id, direction, amount, pay_date, method, note } = req.body;

    const doc = await prisma.document.findUnique({ where: { id: parseInt(document_id) } });
    if (!doc) return errorResponse(res, 404, 'NOT_FOUND', 'Document not found');

    if (req.user.role === 'contact') {
      if (doc.doc_type !== 'CUSTOMER_INVOICE' || doc.contact_id !== req.user.contact_id || direction !== 'receive') {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied to pay this document');
      }
    }

    try {
      const result = await recordPayment(parseInt(document_id), direction, amount, method, pay_date, note);
      res.status(201).json(result);
    } catch (e) {
      if (e.code === 'VALIDATION_ERROR') {
        return errorResponse(res, 400, 'VALIDATION_ERROR', e.message);
      }
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

    const payments = await prisma.payment.findMany({ 
      where: { document_id: parseInt(document_id) }, 
      include: { journal_entry: true } 
    });
    res.status(200).json(payments);
  } catch (error) { next(error); }
};

module.exports = { create, getByDocumentId };
`;
fs.writeFileSync(path.join(srcDir, 'controllers', 'payments.controller.js'), controllerContent);

// 3. Write payments.routes.js
const routesContent = `const express = require('express');
const { create, getByDocumentId } = require('../controllers/payments.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Require authenticate
router.use(authenticate);

// contact-role users can only pay their own CUSTOMER_INVOICE docs (enforced in controller)
router.post('/', create);
router.get('/', getByDocumentId);

module.exports = router;
`;
fs.writeFileSync(path.join(srcDir, 'routes', 'payments.routes.js'), routesContent);

// 4. Update index.js
let indexContent = fs.readFileSync(path.join(srcDir, 'index.js'), 'utf-8');
indexContent = indexContent.replace("// app.use('/api/payments', paymentsRoutes);", "const paymentsRoutes = require('./routes/payments.routes');\napp.use('/api/payments', paymentsRoutes);");
fs.writeFileSync(path.join(srcDir, 'index.js'), indexContent);

console.log('Payments implemented successfully.');
