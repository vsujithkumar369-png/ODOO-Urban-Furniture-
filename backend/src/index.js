// backend/src/index.js
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const contactsRoutes = require('./routes/contacts.routes');
const productsRoutes = require('./routes/products.routes');
const coaRoutes = require('./routes/coa.routes');
const journalsRoutes = require('./routes/journals.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const budgetsRoutes = require('./routes/budgets.routes');
const documentsRoutes = require('./routes/documents.routes');
const paymentsRoutes = require('./routes/payments.routes');
const journalEntriesRoutes = require('./routes/journalEntries.routes');
const reportsRoutes = require('./routes/reports.routes');

const usersRoutes = require('./routes/users.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for easy debugging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount Routes under /api and root as fallback
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/contacts', contactsRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/coa', coaRoutes);
apiRouter.use('/journals', journalsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/budgets', budgetsRoutes);
apiRouter.use('/documents', documentsRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/journal-entries', journalEntriesRoutes);
apiRouter.use('/reports', reportsRoutes);

// Mount both under /api and direct
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Urban Furniture Accounting API', timestamp: new Date().toISOString() });
});

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Global Error Handler & 404 Handler
app.use(errorHandler);
app.use(notFoundHandler);

const { initDatabase } = require('./db');

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Urban Furniture Backend API running on http://localhost:${PORT}`);
      console.log(`📑 Health check: http://localhost:${PORT}/health`);
      console.log(`🐘 Connected to PostgreSQL (urban_furniture_db)`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize PostgreSQL:', err);
    process.exit(1);
  });
