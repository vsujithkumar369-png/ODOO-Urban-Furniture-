const { errorResponse, ok } = require('../utils/errors');
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

module.exports = {
  getProfitLoss: profitLoss,
  getBalanceSheet: balanceSheet,
  getBudgetReport: budgetReport,
  profitLoss,
  balanceSheet,
  budgetReport
};

