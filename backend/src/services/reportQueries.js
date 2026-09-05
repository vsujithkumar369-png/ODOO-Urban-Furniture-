const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getProfitLoss = async (year) => {
  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
  
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
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
  
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
