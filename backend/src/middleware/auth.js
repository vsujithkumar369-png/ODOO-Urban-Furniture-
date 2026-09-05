const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/errors');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'UNAUTHORIZED', 'Missing or invalid authentication token');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid or expired authentication token');
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 403, 'FORBIDDEN', 'User role not found');
    }
    
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action');
    }
    
    next();
  };
};

module.exports = { authenticate, requireRole };
