const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'backend', 'src');

// 1. journalEntries.controller.js
const journalEntriesController = `const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const { journal_id, document_id } = req.query;
    const filter = {};
    if (journal_id) filter.journal_id = parseInt(journal_id);
    if (document_id) filter.document_id = parseInt(document_id);

    const entries = await prisma.journalEntry.findMany({
      where: filter,
      include: {
        lines: {
          include: { account: true }
        }
      }
    });
    res.status(200).json(entries);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        lines: {
          include: { account: true }
        }
      }
    });
    if (!entry) return errorResponse(res, 404, 'NOT_FOUND', 'Journal Entry not found');
    res.status(200).json(entry);
  } catch (error) { next(error); }
};

module.exports = { getAll, getById };
`;
fs.writeFileSync(path.join(srcDir, 'controllers', 'journalEntries.controller.js'), journalEntriesController);

// 2. journalEntries.routes.js
const journalEntriesRoutes = `const express = require('express');
const { getAll, getById } = require('../controllers/journalEntries.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', getAll);
router.get('/:id', getById);

module.exports = router;
`;
fs.writeFileSync(path.join(srcDir, 'routes', 'journalEntries.routes.js'), journalEntriesRoutes);

// 3. reportQueries.js
const reportQueriesContent = `const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getProfitLoss = async (year) => {
  const startDate = new Date(\`\${year}-01-01T00:00:00.000Z\`);
  const endDate = new Date(\`\${year}-12-31T23:59:59.999Z\`);
  
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      account: { type: { in: ['income', 'expense'] } },
      journal_entry: {
        entry_date: { gte: startDate, lte: endDate },
        status: 'posted'
      }
    },
    include: { account: true }
  });
  
  let income = 0;
  let expense = 0;
  
  lines.forEach(line => {
    const debit = parseFloat(line.debit);
    const credit = parseFloat(line.credit);
    
    if (line.account.type === 'income') {
      income += (credit - debit);
    } else if (line.account.type === 'expense') {
      expense += (debit - credit);
    }
  });
  
  return { income, expense, net_income: income - expense };
};

const getBalanceSheet = async (year) => {
  const endDate = new Date(\`\${year}-12-31T23:59:59.999Z\`);
  
  const pl = await getProfitLoss(year);
  const netIncome = pl.net_income;
  
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      account: { type: { in: ['asset', 'liability', 'capital'] } },
      journal_entry: {
        entry_date: { lte: endDate },
        status: 'posted'
      }
    },
    include: { account: true }
  });
  
  let assets = 0;
  let liabilities = 0;
  let capital = netIncome;
  
  lines.forEach(line => {
    const debit = parseFloat(line.debit);
    const credit = parseFloat(line.credit);
    
    if (line.account.type === 'asset') {
      assets += (debit - credit);
    } else if (line.account.type === 'liability') {
      liabilities += (credit - debit);
    } else if (line.account.type === 'capital') {
      capital += (credit - debit);
    }
  });

  const balanced = Math.abs(assets - (liabilities + capital)) < 0.01;

  return { 
    assets: { total: assets }, 
    liabilities: { total: liabilities }, 
    capital: { total: capital }, 
    balanced 
  };
};

const getBudgetReport = async () => {
  const budgets = await prisma.budget.findMany({
    include: { analytic_account: true }
  });

  const report = [];

  for (const b of budgets) {
    const lines = await prisma.documentLine.findMany({
      where: {
        analytic_account_id: b.analytic_account_id,
        document: {
          status: 'confirmed',
          doc_date: {
            gte: b.start_date,
            lte: b.end_date
          }
        }
      },
      include: { document: true }
    });

    let achieved = 0;
    lines.forEach(l => {
      achieved += parseFloat(l.line_total);
    });

    const committed = parseFloat(b.committed_amount);
    const percent = committed > 0 ? (achieved / committed) * 100 : 0;

    report.push({
      ...b,
      achieved_amount: achieved,
      achieved_percent: percent
    });
  }

  return report;
};

module.exports = { getProfitLoss, getBalanceSheet, getBudgetReport };
`;
fs.writeFileSync(path.join(srcDir, 'services', 'reportQueries.js'), reportQueriesContent);

// 4. reports.controller.js
const reportsController = `const { errorResponse } = require('../utils/errors');
const { getProfitLoss, getBalanceSheet, getBudgetReport } = require('../services/reportQueries');

const profitLoss = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const result = await getProfitLoss(year);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

const balanceSheet = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const result = await getBalanceSheet(year);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

const budgetReport = async (req, res, next) => {
  try {
    const result = await getBudgetReport();
    res.status(200).json(result);
  } catch (error) { next(error); }
};

module.exports = { profitLoss, balanceSheet, budgetReport };
`;
fs.writeFileSync(path.join(srcDir, 'controllers', 'reports.controller.js'), reportsController);

// 5. reports.routes.js
const reportsRoutes = `const express = require('express');
const { profitLoss, balanceSheet, budgetReport } = require('../controllers/reports.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/profit-loss', profitLoss);
router.get('/balance-sheet', balanceSheet);
router.get('/budget-report', budgetReport);

module.exports = router;
`;
fs.writeFileSync(path.join(srcDir, 'routes', 'reports.routes.js'), reportsRoutes);

// 6. Update index.js
let indexContent = fs.readFileSync(path.join(srcDir, 'index.js'), 'utf-8');
indexContent = indexContent.replace("// app.use('/api/journalEntries', journalEntriesRoutes);", "const journalEntriesRoutes = require('./routes/journalEntries.routes');\napp.use('/api/journal-entries', journalEntriesRoutes);");
indexContent = indexContent.replace("// app.use('/api/reports', reportsRoutes);", "const reportsRoutes = require('./routes/reports.routes');\napp.use('/api/reports', reportsRoutes);");
fs.writeFileSync(path.join(srcDir, 'index.js'), indexContent);

console.log('Journal Entries and Reports implemented successfully.');
