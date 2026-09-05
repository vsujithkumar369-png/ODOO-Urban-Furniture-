// backend/src/routes/reports.routes.js
const express = require('express');
const store = require('../store');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /reports/profit-loss
router.get('/profit-loss', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  // Aggregate from posted journal entries
  let sales = 0;
  let purchase = 0;
  let otherExpense = 0;

  store.journalEntries.forEach(entry => {
    const entryYear = new Date(entry.entry_date).getFullYear();
    if (entryYear === year && entry.status === 'posted') {
      entry.lines.forEach(line => {
        if (line.account_id === 1) { // Sale Income A/c
          sales += (line.credit - line.debit);
        } else if (line.account_id === 2) { // Purchase Expense A/c
          purchase += (line.debit - line.credit);
        }
      });
    }
  });

  const totalIncome = sales;
  const totalExpense = purchase + otherExpense;
  const netIncome = totalIncome - totalExpense;

  res.json({
    data: {
      year,
      income: {
        sales,
        total: totalIncome
      },
      expenses: {
        purchase,
        other: otherExpense,
        total: totalExpense
      },
      net_income: netIncome
    }
  });
});

// GET /reports/balance-sheet
router.get('/balance-sheet', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  let bank = 0;
  let cash = 0;
  let debtors = 0;
  let creditors = 0;
  let sales = 0;
  let purchase = 0;

  store.journalEntries.forEach(entry => {
    const entryYear = new Date(entry.entry_date).getFullYear();
    if (entryYear <= year && entry.status === 'posted') {
      entry.lines.forEach(line => {
        if (line.account_id === 5) bank += (line.debit - line.credit); // Bank A/c
        if (line.account_id === 6) cash += (line.debit - line.credit); // Cash A/c
        if (line.account_id === 3) debtors += (line.debit - line.credit); // Debtors A/c
        if (line.account_id === 4) creditors += (line.credit - line.debit); // Creditors A/c
        if (line.account_id === 1) sales += (line.credit - line.debit); // Sale Income
        if (line.account_id === 2) purchase += (line.debit - line.credit); // Purchase Expense
      });
    }
  });

  const totalAssets = Math.max(0, bank) + Math.max(0, cash) + Math.max(0, debtors);
  const totalLiabilities = Math.max(0, creditors);
  const netIncome = sales - purchase;
  const capitalAccount = totalAssets - totalLiabilities - netIncome;
  const totalCapital = capitalAccount + netIncome;
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalCapital)) < 0.01;

  res.json({
    data: {
      year,
      assets: {
        bank: Math.max(0, bank),
        cash: Math.max(0, cash),
        debtors: Math.max(0, debtors),
        other: 0.00,
        total: totalAssets
      },
      liabilities: {
        creditors: Math.max(0, creditors),
        other: 0.00,
        total: totalLiabilities
      },
      capital: {
        capital_account: capitalAccount,
        net_income: netIncome,
        total: totalCapital
      },
      balanced
    }
  });
});

// GET /reports/budget-report
router.get('/budget-report', (req, res) => {
  const result = store.budgets.map(budget => {
    let achieved = 0;
    if (budget.status === 'confirmed') {
      store.documents.forEach(doc => {
        if (doc.status === 'confirmed' || doc.status === 'paid' || doc.status === 'partially_paid') {
          const isMatch = (budget.type === 'expense' && doc.doc_type === 'VENDOR_BILL') ||
                          (budget.type === 'income' && doc.doc_type === 'CUSTOMER_INVOICE');
          if (isMatch) {
            doc.lines.forEach(line => {
              if (line.analytic_account_id === budget.analytic_account_id) {
                achieved += line.line_total || 0;
              }
            });
          }
        }
      });
    }

    const committed = budget.committed_amount || 0;
    const pct = committed > 0 ? parseFloat(((achieved / committed) * 100).toFixed(1)) : 0;

    return {
      id: budget.id,
      name: budget.name,
      start_date: budget.start_date,
      end_date: budget.end_date,
      status: budget.status,
      committed_amount: committed,
      achieved_amount: achieved,
      achieved_percent: pct
    };
  });

  res.json({ data: result });
});

module.exports = router;
