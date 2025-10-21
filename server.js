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
const refundsRouter = require('./routes/refunds'); // ✅ NEW
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const disputeRoutes = require('./routes/disputes');
// ✅ NEW: availability routes
const availabilityRoutes = require('./routes/availability');
// ✅ NEW: finance routes
const financeRoutes = require('./routes/finance');
// ✅ NEW: support routes
const supportRoutes = require('./routes/support');
// ✅ NEW: metrics routes (admin dashboards)
const metricsRoutes = require('./routes/metrics');

const app = express();
app.use(cors());

// Stripe webhook (must be before express.json)
app.post(
  '/api/payments/stripe/webhook',
  require('express').raw({ type: 'application/json' }),
  require('./routes/stripeWebhook')
);

// PayPal webhook (JSON body ok here)
app.post(
  '/api/payments/paypal/webhook',
  require('express').json(),
  require('./routes/paypalWebhook')
);

app.use(express.json());

// Order matters: specific before generic
app.use('/api/tutors/lessons', tutorLessonRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/refunds', refundsRouter); // ✅ NEW
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/disputes', disputeRoutes);
// ✅ NEW: mount availability API
app.use('/api/availability', availabilityRoutes);
app.use('/api/tutors', tutorRoutes);
// ✅ FIXED: proper finance mount
app.use('/api/finance', financeRoutes);
// ✅ NEW: mount support API
app.use('/api/support', supportRoutes);
// ✅ NEW: mount metrics API (for Growth/Lessons/Financials/Risk & Ops dashboards)
app.use('/api/admin/metrics', metricsRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(5000, () => console.log('Server running on port 5000'));
    console.log('✅ Connected to MongoDB Atlas');
  })
  .catch((err) => console.error('MongoDB connection error:', err));
