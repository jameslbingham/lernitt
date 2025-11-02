// /server/routes/payouts.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const stripe = require('../utils/stripeClient');
const User = require('../models/User');
const Payout = require('../models/Payout');
const Lesson = require('../models/Lesson'); // kept even if not used in all paths

// --- helpers ---
function isAdmin(req) {
  // If you store roles on the user, prefer checking req.user.role === 'admin'
  // Fallback: allow anyone with auth to use current endpoints; admin-only where noted.
  return req.user && (req.user.role === 'admin' || req.user.isAdmin === true);
}

// ============================= STRIPE ACCOUNT FLOW (kept) =============================

// Create or fetch Stripe Express account for current user
router.post('/stripe/account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.stripeAccountId) {
      const acct = await stripe.accounts.create({ type: 'express', email: user.email });
      user.stripeAccountId = acct.id;
      await user.save();
    }
    res.json({ stripeAccountId: user.stripeAccountId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate onboarding link for Stripe account
router.post('/stripe/onboard-link', auth, async (req, res) => {
  try {
    const { returnUrl, refreshUrl } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user?.stripeAccountId) return res.status(400).json({ error: 'No Stripe account' });

    const link = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: refreshUrl || 'http://localhost:5173/payouts/refresh',
      return_url:  returnUrl  || 'http://localhost:5173/payouts/return',
      type: 'account_onboarding'
    });
    res.json({ url: link.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Trigger/Retry transfer for a payout
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
      metadata: { lesson: String(payout.lesson), tutor: String(tutor._id), payout: String(payout._id) }
    });

    payout.providerId = tr.id;
    payout.status = 'succeeded';
    payout.error = undefined;
    payout.updatedAt = new Date();
    await payout.save();

    res.json({ ok: true, transferId: tr.id });
  } catch (e) {
    try {
      await Payout.findByIdAndUpdate(req.params.payoutId, { status: 'failed', error: e.message, updatedAt: new Date() });
    } catch {}
    res.status(500).json({ error: e.message });
  }
});

// ================================ TUTOR VIEWS (kept) =================================

// List my payouts (tutor)
router.get('/mine', auth, async (req, res) => {
  try {
    const q = { tutor: req.user.id };
    if (req.query.status) q.status = req.query.status;
    const payouts = await Payout.find(q).sort({ createdAt: -1 });
    res.json(payouts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============================== ADMIN ENDPOINTS (new) ===============================
// These power Admin UI (PayoutsTab + Finance). We keep them lightweight and DB-backed.

// GET /api/payouts
// Admin list with optional filters: ?status=&tutor=&currency=&from=YYYY-MM-DD&to=YYYY-MM-DD&q=
router.get('/', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

    const { status, tutor, currency, from, to, q } = req.query || {};
    const find = {};

    if (status) find.status = status;
    if (tutor) find.tutor = tutor; // expects an id (string). Adapt if you filter by tutor name on client.
    if (currency) find.currency = currency;

    if (from || to) {
      find.createdAt = {};
      if (from) find.createdAt.$gte = new Date(from);
      if (to)   find.createdAt.$lte = new Date(to);
    }

    // Optional fuzzy search across a couple of fields
    if (q && String(q).trim()) {
      const needle = String(q).trim();
      find.$or = [
        { _id: needle },
        { tutorName: new RegExp(needle, 'i') },  // only if you store tutorName
        { currency: new RegExp(needle, 'i') }
      ];
    }

    const items = await Payout.find(find).sort({ createdAt: -1 }).limit(2000);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payouts/:id — fetch a single payout (helps UI refresh a row)
router.get('/:id', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, payout });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payouts/:id/approve — mark as paid (manual admin approve)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    const { txnId, note, paidAt } = req.body || {};
    const when = paidAt ? new Date(paidAt) : new Date();

    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout not found' });

    // idempotent-ish
    if (payout.status === 'paid' || payout.status === 'succeeded') {
      return res.json({ ok: true, payout });
    }

    payout.status = 'paid';
    payout.paidAt = when;
    if (txnId != null) payout.txnId = txnId;
    if (note != null) payout.note = note;
    payout.error = undefined;
    payout.updatedAt = new Date();

    // Optional append to notes array (Mongo will create if schema allows).
    // If your schema has `notes: [{ by, at, text }]`, this will work well.
    try {
      payout.notes = payout.notes || [];
      if (note) {
        payout.notes.push({ by: req.user.id, at: new Date(), text: note });
      }
    } catch {}

    await payout.save();
    res.json({ ok: true, payout });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payouts/:id/cancel — mark as cancelled
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    const { note } = req.body || {};

    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout not found' });

    payout.status = 'cancelled';
    payout.updatedAt = new Date();
    if (note != null) payout.note = note;
    try {
      payout.notes = payout.notes || [];
      if (note) payout.notes.push({ by: req.user.id, at: new Date(), text: note });
    } catch {}

    await payout.save();
    res.json({ ok: true, payout });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payouts/:id/fail — mark as failed with an error
router.post('/:id/fail', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    const { reason } = req.body || {};

    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout not found' });

    payout.status = 'failed';
    payout.error = reason || 'Unknown failure';
    payout.updatedAt = new Date();

    await payout.save();
    res.json({ ok: true, payout });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payouts/:id/note — append an internal note
router.post('/:id/note', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    const { text } = req.body || {};
    const t = String(text || '').trim();
    if (!t) return res.status(400).json({ error: 'Note text is required.' });

    // Use $push so we don’t need the document first (and tolerate missing array field)
    const note = { by: req.user.id, at: new Date(), text: t };
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        $set: { updatedAt: new Date() },
        $push: { notes: note }
      },
      { new: true, upsert: false }
    );

    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    res.json({ ok: true, note, payoutId: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =========================== BULK MARK PAID (kept) ===========================

// ✅ Bulk mark payouts as paid (single definition)
router.post('/bulk/mark-paid', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
    const { ids = [], paidAt, txnId, note } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids[] required' });
    }
    const when = paidAt ? new Date(paidAt) : new Date();

    const result = await Payout.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: 'paid',
          paidAt: when,
          txnId: txnId || null,
          note: note || null,
          updatedAt: new Date()
        }
      }
    );

    // Optionally also push a note for each id if you maintain notes[]
    if (note && ids.length) {
      await Payout.updateMany(
        { _id: { $in: ids } },
        { $push: { notes: { by: req.user.id, at: new Date(), text: note } } }
      );
    }

    res.json({
      ok: true,
      matched: result.matchedCount ?? result.n ?? 0,
      modified: result.modifiedCount ?? result.nModified ?? 0,
      ids
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
