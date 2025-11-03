// /server/routes/support.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User'); // for admin check

// --- simple admin guard ---
async function isAdmin(req, res, next) {
  try {
    const me = await User.findById(req.user.id).select('isAdmin');
    if (!me || !me.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  } catch {
    res.status(401).json({ error: 'Auth error' });
  }
}

/**
 * NOTE:
 * DB models for tickets aren’t wired yet.
 * These endpoints are safe stubs so real mode won’t break.
 */

// GET /api/support  (admin: list tickets)
router.get('/', auth, isAdmin, async (_req, res) => {
  res.json({
    items: [
      {
        id: 'S1',
        user: { id: 'u1', name: 'Alice Student', email: 'alice@example.com' },
        subject: 'Refund question',
        status: 'open',
        priority: 'normal',
        assignee: null,
        notes: [],
        createdAt: '2025-09-30T10:00:00Z',
      },
      {
        id: 'S2',
        user: { id: 'u2', name: 'Bob Tutor', email: 'bob@example.com' },
        subject: 'Payout delay',
        status: 'open',
        priority: 'high',
        assignee: { id: 'admin1', name: 'Admin' },
        notes: [{ by: 'admin1', at: '2025-09-30T12:00:00Z', text: 'Investigating.' }],
        createdAt: '2025-09-30T11:30:00Z',
      },
    ],
  });
});

// POST /api/support  (user: create ticket)
router.post('/', auth, async (req, res) => {
  const { subject = '', message = '', priority = 'normal' } = req.body || {};
  if (!subject.trim() || !message.trim()) {
    return res.status(400).json({ error: 'subject and message are required' });
  }
  const ticket = {
    id: `S${Date.now()}`,
    user: { id: req.user.id },
    subject: subject.trim(),
    message: message.trim(),
    status: 'open',
    priority,
    assignee: null,
    notes: [],
    createdAt: new Date().toISOString(),
  };
  res.status(201).json(ticket);
});

// PATCH /api/support/:id/status  (admin: update status)
router.patch('/:id/status', auth, isAdmin, async (req, res) => {
  const { status = 'open' } = req.body || {};
  if (!['open', 'pending', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  res.json({ ok: true, id: req.params.id, status });
});

// PATCH /api/support/:id/assign  (admin: assign to agent)
router.patch('/:id/assign', auth, isAdmin, async (req, res) => {
  const { assigneeId = null } = req.body || {};
  res.json({ ok: true, id: req.params.id, assigneeId });
});

// POST /api/support/:id/note  (admin: add internal note)
router.post('/:id/note', auth, isAdmin, async (req, res) => {
  const { text = '' } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: 'text required' });
  res.json({
    ok: true,
    id: req.params.id,
    note: { by: req.user.id, at: new Date().toISOString(), text: text.trim() },
  });
});

module.exports = router;
