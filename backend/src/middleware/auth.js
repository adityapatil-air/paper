const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../jwtSecret');

// Reads `Authorization: Bearer <token>` issued by /api/auth/login or /register.
const readToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

const expired = (res) => res.status(401).json({
  success: false,
  error: 'Your session has expired. Please sign in again.',
  code: 'AUTH_EXPIRED',
});

// Any signed-in user. Sets req.user = { id, email, role }.
const requireAuth = (req, res, next) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Please sign in to continue.', code: 'AUTH_REQUIRED' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return expired(res);
  }
};

// Guests pass through with req.user = null; a token that is present but invalid is still
// rejected, so an expired session is reported instead of silently treated as a guest.
const optionalAuth = (req, res, next) => {
  const token = readToken(req);
  req.user = null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return expired(res);
  }
};

// Signed-in user with one of the given roles.
const requireRole = (...roles) => [
  requireAuth,
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'You do not have access to this action.', code: 'FORBIDDEN' });
    }
    return next();
  },
];

module.exports = { requireAuth, optionalAuth, requireRole };
