// Error and response helpers for consistent API shape.
const errorResponse = (res, status, code, message) => {
  return res.status(status).json({ error: { code, message } });
};

// Wraps any payload in { data: ... } per contract
const ok = (res, data, status = 200) => {
  return res.status(status).json({ data });
};

module.exports = { errorResponse, ok };
