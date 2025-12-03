// server/routes/payments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Lesson = require('../models/Lesson');

// Helper: is simulated mode?
const hasStripeKeys = !!process.env.STRIPE_SECRET_KEY;
const hasPayPalKeys = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_SECRET;

// CONSTANT CURRENCY FOR ENTIRE PLATFORM
const PLATFORM_CURRENCY = "USD";

/* ============================================
   Create Stripe PaymentIntent (USD-only)
   ============================================ */
router.post('/stripe', auth, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const { amount, lesson } = req.body;
    const currency = PLATFORM_CURRENCY;

    const lessonDoc = await Lesson.findById(lesson);
    if (!lessonDoc) return res.status(404).json({ message: 'Lesson not found' });
    if (lessonDoc.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    // ALWAYS create a real PaymentIntent
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { lesson }
    });

    // Save real PaymentIntent data
    const payment = await Payment.create({
      user: req.user.id,
      lesson,
      provider: 'stripe',
      amount,
      currency,
      status: 'pending',
      providerIds: {
        paymentIntentId: pi.id,
        clientSecret: pi.client_secret
      },
      meta: { simulated: false }
    });

    return res.json({
      simulated: false,
      clientSecret: pi.client_secret,
      paymentId: payment._id,
      status: payment.status,
      intentId: pi.id
    });
  } catch (err) {
    console.error('[PAY][stripe] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   Create PayPal order (USD-only)
   ============================================ */
router.post('/paypal', auth, async (req, res) => {
  try {
    const { amount, lesson } = req.body;
    const currency = PLATFORM_CURRENCY;

    const lessonDoc = await Lesson.findById(lesson);
    if (!lessonDoc) return res.status(404).json({ message: 'Lesson not found' });
    if (lessonDoc.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    let orderId = `order_test_${Math.random().toString(36).slice(2, 16)}`;

    const payment = await Payment.create({
      user: req.user.id,
      lesson,
      provider: 'paypal',
      amount: Number(amount),
      currency,
      status: 'pending',
      providerIds: { orderId },
      meta: { simulated: !hasPayPalKeys }
    });

    return res.json({
      simulated: !hasPayPalKeys,
      id: orderId,
      paymentId: payment._id,
      status: payment.status
    });
  } catch (err) {
    console.error('[PAY][paypal] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   Payment list for logged-in user
   ============================================ */
router.get('/mine', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const [items, count] = await Promise.all([
      Payment.find({ user: req.user.id })
        .populate('lesson', 'startTime endTime status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments({ user: req.user.id })
    ]);

    return res.json({ page, count, payments: items });
  } catch (err) {
    console.error('[PAY][mine] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   Manual payment status update
   ============================================ */
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const status = (req.body && req.body.status) || req.query.status; // 'succeeded' | 'failed' | 'pending'
    if (!['succeeded', 'failed', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const payment = await Payment.findById(req.params.id).populate('lesson');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const isOwner = payment.user.toString() === req.user.id;
    const isTutor = payment.lesson && payment.lesson.tutor.toString() === req.user.id;
    if (!isOwner && !isTutor) return res.status(403).json({ message: 'Not allowed' });

    payment.status = status;
    await payment.save();

    // When payment succeeds, mark lesson as paid in lifecycle
    if (status === 'succeeded' && payment.lesson) {
      const lesson = payment.lesson;
      lesson.status = 'paid';
      lesson.isPaid = true;
      lesson.paidAt = new Date();
      await lesson.save();
    }

    return res.json(payment);
  } catch (err) {
    console.error('[PAY][status] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   Refund (legal-only)
   ============================================ */
router.patch('/:id/refund', auth, async (req, res) => {
  try {
    const { reason } = req.body || {};

    if (reason !== 'legal_required') {
      return res.status(403).json({ message: 'Refunds not allowed unless required by law.' });
    }

    const payment = await Payment.findById(req.params.id).populate('lesson');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const lesson = payment.lesson;
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const isStudent = lesson.student.toString() === req.user.id;
    const isTutor = lesson.tutor.toString() === req.user.id;
    if (!isStudent && !isTutor) return res.status(403).json({ message: 'Not allowed' });

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not succeeded; cannot refund' });
    }

    if (payment.refundAmount && payment.refundAmount > 0) {
      return res.status(400).json({ message: 'Already refunded' });
    }

    let refundProviderId = `re_sim_${Math.random().toString(36).slice(2, 12)}`;

    payment.refundAmount = payment.amount;
    payment.refundProviderId = refundProviderId;
    payment.refundedAt = new Date();
    await payment.save();

    lesson.status = 'cancelled';
    lesson.cancelledAt = new Date();
    lesson.cancelledBy = isStudent ? 'student' : 'tutor';
    lesson.cancelReason = 'legal_required_refund';
    lesson.reschedulable = false;
    await lesson.save();

    return res.json({
      message: 'Refund processed due to legal requirement. Lesson cancelled.',
      paymentId: payment._id,
      refundAmount: payment.refundAmount,
      refundProviderId: payment.refundProviderId,
      refundedAt: payment.refundedAt,
      lessonId: lesson._id,
      lessonStatus: lesson.status
    });
  } catch (err) {
    console.error('[PAY][refund] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   Stripe + PayPal SUCCESS / CANCEL callbacks
   ============================================ */
router.get("/stripe/success", async (req, res) => {
  const { lessonId } = req.query;
  if (!lessonId) {
    return res.status(400).send("Missing lessonId");
  }

  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  return res.redirect(`${frontend}/confirm/${encodeURIComponent(lessonId)}`);
});

router.get("/stripe/cancel", async (req, res) => {
  const { lessonId } = req.query;
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";

  return res.redirect(
    `${frontend}/pay/${encodeURIComponent(lessonId || "")}?cancel=1`
  );
});

router.get("/paypal/success", async (req, res) => {
  const { lessonId } = req.query;
  if (!lessonId) {
    return res.status(400).send("Missing lessonId");
  }

  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  return res.redirect(`${frontend}/confirm/${encodeURIComponent(lessonId)}`);
});

router.get("/paypal/cancel", async (req, res) => {
  const { lessonId } = req.query;
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";

  return res.redirect(
    `${frontend}/pay/${encodeURIComponent(lessonId || "")}?cancel=1`
  );
});

/* ============================================
   Mark lesson as PAID (Stripe + PayPal)
   ============================================ */
router.post("/stripe/mark-paid", async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ message: "Missing lessonId" });

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    lesson.status = "paid";
    lesson.isPaid = true;
    lesson.paidAt = new Date();
    await lesson.save();

    return res.json({ ok: true, lessonId });
  } catch (err) {
    console.error("[PAY][stripe mark-paid] error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/paypal/mark-paid", async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ message: "Missing lessonId" });

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    lesson.status = "paid";
    lesson.isPaid = true;
    lesson.paidAt = new Date();
    await lesson.save();

    return res.json({ ok: true, lessonId });
  } catch (err) {
    console.error("[PAY][paypal mark-paid] error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
