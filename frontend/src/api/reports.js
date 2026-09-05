import client from './client';
export const getProfitLoss  = (year) => client.get('/reports/profit-loss', { params: { year } });
export const getBalanceSheet = (year) => client.get('/reports/balance-sheet', { params: { year } });
export const getBudgetReport = () => client.get('/reports/budget-report');
