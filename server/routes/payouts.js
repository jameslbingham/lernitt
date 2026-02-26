// /server/routes/payouts.js
const express = require('express');
const router = express.Router();
const paypal = require('@paypal/payouts-sdk');

const { auth } = require("../middleware/auth");
const stripe = require('../utils/stripeClient');
const User = require('../models/User');
const Payout = require('../models/Payout');

// --- PayPal Environment Setup (ORIGINAL PRESERVED) ---
function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;
  
  const environment = process.env.PAYPAL_ENV === 'live'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
    
  return new paypal.core.PayPalHttpClient(environment);
}

function isAdmin(req) {
  return req.user && (req.user.role === 'admin' || req.user.isAdmin === true);
}

// ============================= PAYPAL PAYOUT FLOW =============================

router.post('/paypal/transfer/:payoutId', auth, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId).populate('tutor');
    if (!payout) return res.status(404).json({ error: 'Payout not found' });

    const tutor = payout.tutor;
    const receiverEmail = tutor.paypalEmail || tutor.email;

    payout.status = 'processing';
    await payout.save();

    const request = new paypal.payouts.PayoutsPostRequest();
    request.requestBody({
      sender_batch_header: {
        sender_batch_id: `batch_${payout._id}_${Date.now()}`,
        email_subject: "You have a payout from Lernitt!",
        recipient_type: "EMAIL"
      },
      items: [{
        note: `Payout for Lernitt Lesson`,
        receiver: receiverEmail,
        sender_item_id: String(payout._id),
        amount: {
          value: (payout.amountCents / 100).toFixed(2),
          currency: payout.currency.toUpperCase()
        }
      }]
    });

    const client = getPayPalClient();
    const response = await client.execute(request);

    payout.providerId = response.result.batch_header.payout_batch_id;
    payout.status = 'processing';
    payout.updatedAt = new Date();
    await payout.save();

    res.json({ ok: true, batchId: payout.providerId });
  } catch (e) {
    console.error('PayPal Payout Error:', e);
    await Payout.findByIdAndUpdate(req.params.payoutId, { 
      status: 'failed', 
      error: e.message 
    });
    res.status(500).json({ error: e.message });
  }
});

// ============================= STRIPE ACCOUNT FLOW (UPDATED) =============================

/**
 * POST /api/payouts/stripe/onboard
 * ✅ NEW: Generates the onboarding link so tutors can link their bank account via Stripe
 */
router.post('/stripe/onboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.stripeAccountId) {
      const acct = await stripe.accounts.create({ 
        type: 'express', 
        email: user.email,
        capabilities: { transfers: { requested: true } }
      });
      user.stripeAccountId = acct.id;
      await user.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const accountLink = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${frontendUrl}/payouts?stripe=refresh`,
      return_url: `${frontendUrl}/payouts?stripe=success`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (e) {
    console.error("Stripe Onboard Error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/stripe/transfer/:payoutId', auth, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId).populate('tutor');
    if (!payout) return res.status(404).json({ error: 'Payout not found' });

    const tutor = await User.findById(payout.tutor._id);
    if (!tutor?.stripeAccountId) return res.status(400).json({ error: 'Tutor missing Stripe account' });

    payout.status = 'processing';
    await payout.save();

    const tr = await stripe.transfers.create({
      amount: payout.amountCents,
      currency: payout.currency.toLowerCase(),
      destination: tutor.stripeAccountId,
      metadata: { payout: String(payout._id) }
    });

    payout.providerId = tr.id;
    payout.status = 'succeeded';
    payout.updatedAt = new Date();
    await payout.save();

    res.json({ ok: true, transferId: tr.id });
  } catch (e) {
    await Payout.findByIdAndUpdate(req.params.payoutId, { status: 'failed', error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ================================ SHARED ENDPOINTS =================================

router.get('/mine', auth, async (req, res) => {
  try {
    const payouts = await Payout.find({ tutor: req.user.id }).sort({ createdAt: -1 });
    res.json(payouts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    const items = await Payout.find().sort({ createdAt: -1 }).limit(100);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
