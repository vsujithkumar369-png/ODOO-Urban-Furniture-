// backend/src/routes/reports.routes.js
const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /reports/profit-loss
router.get('/profit-loss', async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  try {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN jel.account_id = 1 THEN jel.credit - jel.debit ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN jel.account_id = 2 THEN jel.debit - jel.credit ELSE 0 END), 0) as purchase
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE je.status = 'posted'
        AND EXTRACT(YEAR FROM TO_DATE(je.entry_date, 'YYYY-MM-DD')) = $1
    `;
    const result = await pool.query(query, [year]);
    const sales = parseFloat(result.rows[0].sales) || 0;
    const purchase = parseFloat(result.rows[0].purchase) || 0;
    const otherExpense = 0.00;
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
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate Profit & Loss report' } });
  }
});

// GET /reports/balance-sheet
router.get('/balance-sheet', async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  try {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN jel.account_id = 5 THEN jel.debit - jel.credit ELSE 0 END), 0) as bank,
        COALESCE(SUM(CASE WHEN jel.account_id = 6 THEN jel.debit - jel.credit ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN jel.account_id = 3 THEN jel.debit - jel.credit ELSE 0 END), 0) as debtors,
        COALESCE(SUM(CASE WHEN jel.account_id = 4 THEN jel.credit - jel.debit ELSE 0 END), 0) as creditors,
        COALESCE(SUM(CASE WHEN jel.account_id = 1 THEN jel.credit - jel.debit ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN jel.account_id = 2 THEN jel.debit - jel.credit ELSE 0 END), 0) as purchase
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE je.status = 'posted'
        AND EXTRACT(YEAR FROM TO_DATE(je.entry_date, 'YYYY-MM-DD')) <= $1
    `;
    const result = await pool.query(query, [year]);
    const r = result.rows[0];

    const bank = parseFloat(r.bank) || 0;
    const cash = parseFloat(r.cash) || 0;
    const debtors = parseFloat(r.debtors) || 0;
    const creditors = parseFloat(r.creditors) || 0;
    const sales = parseFloat(r.sales) || 0;
    const purchase = parseFloat(r.purchase) || 0;

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
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate Balance Sheet' } });
  }
});

// GET /reports/budget-report
router.get('/budget-report', async (req, res) => {
  try {
    const budgetsRes = await pool.query('SELECT * FROM budgets ORDER BY id ASC');

    const result = await Promise.all(budgetsRes.rows.map(async (budget) => {
      let achieved = 0;
      if (budget.status === 'confirmed') {
        const docType = budget.type === 'expense' ? 'VENDOR_BILL' : 'CUSTOMER_INVOICE';
        const q = `
          SELECT COALESCE(SUM(dl.line_total), 0) as achieved
          FROM document_lines dl
          JOIN documents d ON dl.document_id = d.id
          WHERE d.status IN ('confirmed', 'paid', 'partially_paid')
            AND d.doc_type = $1
            AND dl.analytic_account_id = $2
        `;
        const aRes = await pool.query(q, [docType, budget.analytic_account_id]);
        achieved = parseFloat(aRes.rows[0].achieved) || 0;
      }

      const committed = parseFloat(budget.committed_amount) || 0;
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
    }));

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch budget report' } });
  }
});

module.exports = router;
