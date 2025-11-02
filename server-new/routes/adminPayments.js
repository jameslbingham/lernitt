// /server/routes/adminPayments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Admin check
async function isAdmin(req, res, next) {
  try {
    const me = await User.findById(req.user.id).select('isAdmin');
    if (!me || !me.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  } catch {
    return res.status(401).json({ error: 'Auth error' });
  }
}

/**
 * GET /api/admin/payments
 * Query: status, user, lesson, from, to, page, limit
 */
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const { status, user, lesson, from, to, page = 1, limit = 20 } = req.query;

    const q = {};
    if (status) q.status = status; // pending|succeeded|failed|refunded
    if (user) q.user = user;
    if (lesson) q.lesson = lesson;

    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }

    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [items, total] = await Promise.all([
      Payment.find(q)
        .sort({ createdAt: -1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .populate('user', 'name email')
        .populate('lesson', 'subject startTime endTime status'),
      Payment.countDocuments(q),
    ]);

    return res.json({
      page: pg,
      limit: lim,
      total,
      totalPages: Math.ceil(total / lim),
      items,
    });
  } catch (e) {
    console.error('[ADMIN][PAYMENTS][LIST] error=', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/admin/payments/:id
 */
router.get('/:id', auth, isAdmin, async (req, res) => {
  try {
    const p = await Payment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('lesson', 'subject startTime endTime status');

    if (!p) return res.status(404).json({ error: 'Payment not found' });
    return res.json(p);
  } catch (e) {
    console.error('[ADMIN][PAYMENTS][ONE] error=', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
