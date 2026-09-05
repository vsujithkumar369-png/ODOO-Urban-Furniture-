// backend/src/middleware/errorHandler.js

/**
 * Centralized Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error ${req.method} ${req.originalUrl}]`, err);

  // PostgreSQL Unique Constraint Violation
  if (err.code === '23505') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A record with this unique identifier (email, name, or login_id) already exists.'
      }
    });
  }

  // PostgreSQL Foreign Key Violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Cannot delete or update record because it is referenced in active accounting documents.'
      }
    });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal Server Error'
    }
  });
}

/**
 * Centralized 404 Route Not Found Handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
