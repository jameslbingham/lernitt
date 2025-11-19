// /server/routes/notifications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User'); // for admin checks

// ---- Admin check ----
async function isAdmin(req, res, next) {
  try {
    const me = await User.findById(req.user.id).select('isAdmin');
    if (!me || !me.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  } catch {
    res.status(401).json({ error: 'Auth error' });
  }
}

// ======================
// USER ROUTES
// ======================

// Get my notifications
router.get('/', auth, async (req, res) => {
  const notes = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notes);
});

// Mark one notification as read
router.patch('/:id/read', auth, async (req, res) => {
  const note = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { read: true },
    { new: true }
  );
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ ok: true });
});

// Create a fake notification (for testing only)
router.post('/test', auth, async (req, res) => {
  const note = await Notification.create({
    user: req.user.id,
    type: 'test',
    title: 'Test notification',
    message: 'This is only a test.',
    data: {}
  });
  res.json(note);
});

// ======================
// ADMIN ROUTES
// ======================

// Broadcast system-wide notification
// POST /api/notifications/broadcast
router.post('/broadcast', auth, isAdmin, async (req, res) => {
  const { title = '', message = '', audience = 'all' } = req.body || {};
  return res.json({ ok: true, title, message, audience, sentAt: new Date().toISOString() });
});

// Targeted notifications (specific users)
router.post('/custom', auth, isAdmin, async (req, res) => {
  const { userIds = [], title = '', message = '' } = req.body || {};
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds (non-empty array) is required' });
  }
  if (!title.trim() || !message.trim()) {
    return res.status(400).json({ error: 'title and message are required' });
  }

  return res.json({
    ok: true,
    count: userIds.length,
    userIds,
    title,
    message,
    sentAt: new Date().toISOString(),
  });
});

// Admin: delete a notification
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true, id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: list all notifications
router.get('/all', auth, isAdmin, async (req, res) => {
  try {
    const notes = await Notification.find().sort({ createdAt: -1 }).limit(200);
    res.json(notes);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: resend notification
router.post('/:id/resend', auth, isAdmin, async (req, res) => {
  try {
    const note = await Notification.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Notification not found' });

    res.json({ ok: true, id: note.id, resentAt: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================
// SENDGRID EMAIL TEST  ★ NEW ★
// ======================
// GET /api/notifications/test-email
router.get('/test-email', auth, async (req, res) => {
  try {
    const sendEmail = require('../utils/sendEmail');

    await sendEmail({
      to: req.user.email,
      subject: 'Lernitt Test Email',
      text: 'If you received this, SendGrid is working!',
    });

    res.json({ ok: true, message: 'Test email sent' });
  } catch (err) {
    console.error('SendGrid test error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
