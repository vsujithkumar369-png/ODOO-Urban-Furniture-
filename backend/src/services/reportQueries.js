const { pool } = require('../db');

const getProfitLoss = async (year) => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const res = await pool.query(
    `SELECT jel.debit, jel.credit, LOWER(a.type) AS account_type
     FROM journal_entry_lines jel
     JOIN journal_entries je ON jel.journal_entry_id = je.id
     JOIN accounts a ON jel.account_id = a.id
     WHERE LOWER(a.type) IN ('income', 'expense')
       AND LOWER(je.status) = 'posted'
       AND je.entry_date >= $1 AND je.entry_date <= $2`,
    [startDate, endDate]
  );

  let income = 0;
  let expense = 0;

  res.rows.forEach(line => {
    const debit = parseFloat(line.debit || 0);
    const credit = parseFloat(line.credit || 0);

    if (line.account_type === 'income') {
      income += (credit - debit);
    } else if (line.account_type === 'expense') {
      expense += (debit - credit);
    }
  });

  return { income, expense, net_income: income - expense };
};

const getBalanceSheet = async (year) => {
  const endDate = `${year}-12-31`;
  const pl = await getProfitLoss(year);
  const netIncome = pl.net_income;

  const res = await pool.query(
    `SELECT jel.debit, jel.credit, LOWER(a.type) AS account_type
     FROM journal_entry_lines jel
     JOIN journal_entries je ON jel.journal_entry_id = je.id
     JOIN accounts a ON jel.account_id = a.id
     WHERE LOWER(a.type) IN ('asset', 'liability', 'capital')
       AND LOWER(je.status) = 'posted'
       AND je.entry_date <= $1`,
    [endDate]
  );

  let assets = 0;
  let liabilities = 0;
  let capital = netIncome;

  res.rows.forEach(line => {
    const debit = parseFloat(line.debit || 0);
    const credit = parseFloat(line.credit || 0);

    if (line.account_type === 'asset') {
      assets += (debit - credit);
    } else if (line.account_type === 'liability') {
      liabilities += (credit - debit);
    } else if (line.account_type === 'capital') {
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
  const budgetsRes = await pool.query('SELECT * FROM budgets ORDER BY id ASC');
  const report = [];

  for (const b of budgetsRes.rows) {
    const linesRes = await pool.query(
      `SELECT dl.line_total
       FROM document_lines dl
       JOIN documents d ON dl.document_id = d.id
       WHERE dl.analytic_account_id = $1
         AND LOWER(d.status) IN ('confirmed', 'paid')
         AND d.doc_date >= $2 AND d.doc_date <= $3`,
      [b.analytic_account_id, String(b.start_date), String(b.end_date)]
    );

    let achieved = 0;
    linesRes.rows.forEach(l => {
      achieved += parseFloat(l.line_total || 0);
    });

    const committed = parseFloat(b.committed_amount || 0);
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

