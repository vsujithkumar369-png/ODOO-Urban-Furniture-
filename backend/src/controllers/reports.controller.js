const { errorResponse } = require('../utils/errors');
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
