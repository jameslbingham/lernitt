// server/routes/payments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Lesson = require('../models/Lesson');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch'); // Required for real PayPal API calls

// Helper: is simulated mode?
const hasStripeKeys = !!process.env.STRIPE_SECRET_KEY;
const hasPayPalKeys = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_SECRET;

// CONSTANT CURRENCY FOR ENTIRE PLATFORM
const PLATFORM_CURRENCY = "EUR";

/* -------------------------------------------
   Helper: compute amount (cents) from lesson
------------------------------------------- */
function amountCentsFromLesson(lessonDoc) {
  if (!lessonDoc) return 0;
  if (typeof lessonDoc.amountCents === 'number') return Math.max(0, Math.round(lessonDoc.amountCents));
  if (typeof lessonDoc.priceCents === 'number') return Math.max(0, Math.round(lessonDoc.priceCents));
  if (typeof lessonDoc.price === 'number') return Math.max(0, Math.round(lessonDoc.price * 100));
  return 0;
}

/* -------------------------------------------
   ✅ NEW: Get PayPal Access Token (Real API)
------------------------------------------- */
async function getPayPalAccessToken() {
  const authHeader = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  const baseUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: { Authorization: `Basic ${authHeader}` },
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to get PayPal token');
  return data.access_token;
}

/* ============================================
   Create Stripe Checkout Session
   POST /api/payments/stripe/create
   ============================================ */
router.post('/stripe/create', auth, async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ message: 'Missing lessonId' });

    const lessonDoc = await Lesson.findById(lessonId).populate('tutor');
    if (!lessonDoc) return res.status(404).json({ message: 'Lesson not found' });
    if (lessonDoc.student.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });

    const amount = amountCentsFromLesson(lessonDoc);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Lesson has no payable amount' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: PLATFORM_CURRENCY.toLowerCase(),
          product_data: { name: `Lesson with ${lessonDoc.tutor?.name || 'Tutor'}` },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm/${lessonId}?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${lessonId}?cancel=true`,
      metadata: { lesson: lessonId }
    });

    const payment = await Payment.create({
      user: req.user.id,
      lesson: lessonId,
      provider: 'stripe',
      amount,
      currency: PLATFORM_CURRENCY,
      status: 'pending',
      providerIds: { checkoutSessionId: session.id },
      meta: { simulated: false }
    });

    return res.json({ url: session.url, paymentId: payment._id, status: payment.status });
  } catch (err) {
    console.error('[PAY][stripe/create] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   ✅ UPDATED: Create REAL PayPal Order
   POST /api/payments/paypal/create
   ============================================ */
router.post('/paypal/create', auth, async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ message: 'Missing lessonId' });

    const lessonDoc = await Lesson.findById(lessonId);
    if (!lessonDoc) return res.status(404).json({ message: 'Lesson not found' });
    if (lessonDoc.student.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });

    const amountCents = amountCentsFromLesson(lessonDoc);
    if (!amountCents || amountCents <= 0) return res.status(400).json({ message: 'Lesson has no payable amount' });

    const amountDecimal = (amountCents / 100).toFixed(2);
    const accessToken = await getPayPalAccessToken();
    const baseUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

    // Call real PayPal API
    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: PLATFORM_CURRENCY, value: amountDecimal },
          reference_id: lessonId
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm/${lessonId}?success=true`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${lessonId}?cancel=true`,
        }
      }),
    });

    const order = await response.json();
    if (!response.ok) throw new Error(order.message || 'PayPal Order creation failed');

    const approvalUrl = order.links.find(l => l.rel === 'approve')?.href;

    const payment = await Payment.create({
      user: req.user.id,
      lesson: lessonId,
      provider: 'paypal',
      amount: amountCents,
      currency: PLATFORM_CURRENCY,
      status: 'pending',
      providerIds: { orderId: order.id },
      meta: { simulated: false }
    });

    return res.json({ 
      url: approvalUrl, 
      paymentId: payment._id, 
      id: order.id, 
      status: payment.status 
    });
  } catch (err) {
    console.error('[PAY][paypal/create] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   Create Stripe PaymentIntent (Manual amount)
   POST /api/payments/stripe
   ============================================ */
router.post('/stripe', auth, async (req, res) => {
  try {
    const { amount, lesson } = req.body;
    const lessonDoc = await Lesson.findById(lesson).populate('tutor');
    if (!lessonDoc) return res.status(404).json({ message: 'Lesson not found' });
    if (lessonDoc.student.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: PLATFORM_CURRENCY.toLowerCase(),
          product_data: { name: `Lesson with ${lessonDoc.tutor?.name || 'Tutor'}` },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm/${lesson}?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${lesson}?cancel=true`,
      metadata: { lesson }
    });

    const payment = await Payment.create({
      user: req.user.id,
      lesson,
      provider: 'stripe',
      amount,
      currency: PLATFORM_CURRENCY,
      status: 'pending',
      providerIds: { checkoutSessionId: session.id },
      meta: { simulated: false }
    });

    return res.json({ url: session.url, paymentId: payment._id, status: payment.status });
  } catch (err) {
    console.error('[PAY][stripe] error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err.message || err) });
  }
});

/* ============================================
   ✅ UPDATED: Create REAL PayPal Order (Manual)
   POST /api/payments/paypal
   ============================================ */
router.post('/paypal', auth, async (req, res) => {
  try {
    const { amount, lesson } = req.body; // amount is in cents
    const lessonDoc = await Lesson.findById(lesson);
    if (!lessonDoc) return res.status(404).json({ message: 'Lesson not found' });
    if (lessonDoc.student.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });

    const amountDecimal = (Number(amount) / 100).toFixed(2);
    const accessToken = await getPayPalAccessToken();
    const baseUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: PLATFORM_CURRENCY, value: amountDecimal },
          reference_id: lesson
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm/${lesson}?success=true`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${lesson}?cancel=true`,
        }
      }),
    });

    const order = await response.json();
    if (!response.ok) throw new Error(order.message || 'PayPal Order creation failed');

    const approvalUrl = order.links.find(l => l.rel === 'approve')?.href;

    const payment = await Payment.create({
      user: req.user.id,
      lesson,
      provider: 'paypal',
      amount: Number(amount),
      currency: PLATFORM_CURRENCY,
      status: 'pending',
      providerIds: { orderId: order.id },
      meta: { simulated: false }
    });

    return res.json({ url: approvalUrl, id: order.id, paymentId: payment._id, status: payment.status });
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
    const status = (req.body && req.body.status) || req.query.status;
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
  if (!lessonId) return res.status(400).send("Missing lessonId");
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  return res.redirect(`${frontend}/confirm/${encodeURIComponent(lessonId)}`);
});

router.get("/stripe/cancel", async (req, res) => {
  const { lessonId } = req.query;
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  return res.redirect(`${frontend}/pay/${encodeURIComponent(lessonId || "")}?cancel=1`);
});

router.get("/paypal/success", async (req, res) => {
  const { lessonId } = req.query;
  if (!lessonId) return res.status(400).send("Missing lessonId");
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  return res.redirect(`${frontend}/confirm/${encodeURIComponent(lessonId)}`);
});

router.get("/paypal/cancel", async (req, res) => {
  const { lessonId } = req.query;
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  return res.redirect(`${frontend}/pay/${encodeURIComponent(lessonId || "")}?cancel=1`);
});

/* ============================================
   Mark lesson as PAID (Internal utility)
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
