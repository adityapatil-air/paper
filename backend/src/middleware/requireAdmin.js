const jwt = require('jsonwebtoken');

// Must match the secret used to sign tokens in routes/auth.js.
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-me';

// Accepts `Authorization: Bearer <token>` issued by /api/auth/login and requires role "admin".
const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ success: false, error: 'Please sign in as an administrator.', code: 'AUTH_REQUIRED' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Administrator access is required.', code: 'FORBIDDEN' });
    }
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Your session has expired. Please sign in again.', code: 'AUTH_EXPIRED' });
  }
};

module.exports = { requireAdmin };
