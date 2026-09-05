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

function isValidId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0;
}

function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

const VALID_DOC_TYPES = ['PO', 'SO', 'VENDOR_BILL', 'CUSTOMER_INVOICE'];
function isValidDocType(type) {
  return typeof type === 'string' && VALID_DOC_TYPES.includes(type.toUpperCase());
}

const VALID_ACCOUNT_TYPES = ['asset', 'liability', 'capital', 'income', 'expense'];
function isValidAccountType(type) {
  return typeof type === 'string' && VALID_ACCOUNT_TYPES.includes(type.toLowerCase());
}

const VALID_JOURNAL_TYPES = ['sales', 'purchase', 'bank', 'cash', 'general'];
function isValidJournalType(type) {
  return typeof type === 'string' && VALID_JOURNAL_TYPES.includes(type.toLowerCase());
}

module.exports = {
  isValidLoginId,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isNonNegativeNumber,
  isValidId,
  isValidDate,
  isValidDocType,
  isValidAccountType,
  isValidJournalType,
  VALID_DOC_TYPES,
  VALID_ACCOUNT_TYPES,
  VALID_JOURNAL_TYPES
};
