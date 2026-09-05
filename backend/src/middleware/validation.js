// backend/src/middleware/validation.js

/**
 * Reusable validation helpers for Urban Furniture Accounting System.
 */

function isValidLoginId(loginId) {
  return typeof loginId === 'string' && /^[a-zA-Z0-9_]{6,12}$/.test(loginId);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasUpper && hasLower && hasSpecial;
}

function isValidPhone(phone) {
  if (!phone) return true; // Phone is optional
  return typeof phone === 'string' && /^[0-9+\-\s()]{7,20}$/.test(phone);
}

function isNonNegativeNumber(val) {
  const num = parseFloat(val);
  return !isNaN(num) && num >= 0;
}

module.exports = {
  isValidLoginId,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isNonNegativeNumber
};
