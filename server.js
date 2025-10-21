// /server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const tutorRoutes = require('./routes/tutors');
const lessonRoutes = require('./routes/lessons');
const reviewRoutes = require('./routes/reviews');
const studentRoutes = require('./routes/students');
const tutorLessonRoutes = require('./routes/tutorLessons');
const paymentRoutes = require('./routes/payments');
const payoutRoutes = require('./routes/payouts');
const refundsRouter = require('./routes/refunds');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const disputeRoutes = require('./routes/disputes');
const availabilityRoutes = require('./routes/availability');
const financeRoutes = require('./routes/finance');
const supportRoutes = require('./routes/support');
const metricsRoutes = require('./routes/metrics');

const app = express();

// --- CORS (allowlist) --------------------------------------------------------
const ALLOW = [
  'http://localhost:5173',
  'https://lernitt.vercel.app',
];
app.use(cors({ origin: ALLOW, credentials: true }));

// --- Webhooks (order matters; before global express.json) --------------------
app.post(
  '/api/payments/stripe/webhook',
  require('express').raw({ type: 'application/json' }),
  require('./routes/stripeWebhook')
);
app.post(
  '/api/payments/paypal/webhook',
  require('express').json(),
  require('./routes/paypalWebhook')
);

// --- Parsers -----------------------------------------------------------------
app.use(express.json());

// --- Health check (no DB required) ------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --- Routes (keep existing) --------------------------------------------------
app.use('/api/tutors/lessons', tutorLessonRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/refunds', refundsRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin/metrics', metricsRoutes);

// --- Start server immediately (non-blocking DB) ------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- Connect MongoDB (optional; logs on failure) -----------------------------
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) =>
      console.error('MongoDB connection error:', err && err.message ? err.message : err)
    );
} else {
  console.warn('⚠️ MONGODB_URI not set; running without database.');
}
