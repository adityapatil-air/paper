require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { supabase } = require('./supabaseClient');
const { ensureBucket } = require('./storage');

const authRoutes = require('./routes/auth');
const papersRoutes = require('./routes/papers');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications');
const submissionsRoutes = require('./routes/submissions');
const issuesRoutes = require('./routes/issues');
const paymentsRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings');

const app = express();

// Behind a reverse proxy (Nginx, Render) every request arrives from the proxy's address;
// set TRUST_PROXY=true there so req.ip (used by the auth rate limits) is the client's.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Basic config
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
const jsonParser = express.json();
app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/payments/webhook')) return next();
  return jsonParser(req, res, next);
});
app.use(morgan('dev'));

// Simple health check
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is reachable. Try /api/health for health status.',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    supabaseConfigured: Boolean(supabase),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
  // Create the storage bucket on first run so uploads don't fail against an empty project.
  ensureBucket();
});
