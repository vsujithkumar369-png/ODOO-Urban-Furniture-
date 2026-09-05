const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorResponse } = require('./utils/errors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);
const contactsRoutes = require('./routes/contacts.routes');
app.use('/api/contacts', contactsRoutes);
const productsRoutes = require('./routes/products.routes');
app.use('/api/products', productsRoutes);
const coaRoutes = require('./routes/coa.routes');
app.use('/api/coa', coaRoutes);
const journalsRoutes = require('./routes/journals.routes');
app.use('/api/journals', journalsRoutes);
const analyticsRoutes = require('./routes/analytics.routes');
app.use('/api/analytics', analyticsRoutes);
const budgetsRoutes = require('./routes/budgets.routes');
app.use('/api/budgets', budgetsRoutes);
const documentsRoutes = require('./routes/documents.routes');
app.use('/api/documents', documentsRoutes);
const paymentsRoutes = require('./routes/payments.routes');
app.use('/api/payments', paymentsRoutes);
const journalEntriesRoutes = require('./routes/journalEntries.routes');
app.use('/api/journal-entries', journalEntriesRoutes);
const reportsRoutes = require('./routes/reports.routes');
app.use('/api/reports', reportsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  return errorResponse(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
