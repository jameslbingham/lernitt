// /server/routes/students.js
const express = require('express');
const { auth } = require("../middleware/auth");
const User = require('../models/User');
const Lesson = require('../models/Lesson');

const router = express.Router();

/* --------------------------
   Normalize old/legacy statuses
   -------------------------- */
function normalizeStatus(status) {
  const raw = (status || "").toLowerCase();

  const allowed = [
    "booked",
    "paid",
    "confirmed",
    "reschedule_requested",
    "completed",
    "cancelled",
    "expired"
  ];
  if (allowed.includes(raw)) return raw;

  // Legacy → new
  if (raw === "pending") return "booked";
  if (raw === "not_approved") return "cancelled";
  if (raw === "reschedule_pending") return "reschedule_requested";

  return "booked";
}

/**
 * GET /api/students/me
 * Get my student profile
 */
router.get('/me', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select('-password');
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PATCH /api/students/me
 * Update my student profile
 */
router.patch('/me', auth, async (req, res) => {
  try {
    const updates = (({ name, avatar }) => ({ name, avatar }))(req.body);
    const student = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select('-password');
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/students/lessons
 * Get lessons for the logged-in student, with filters + pagination
 */
router.get('/lessons', auth, async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 10 } = req.query;

    // UPDATED: Allowed lifecycle statuses
    const ALLOWED = [
      "booked",
      "paid",
      "confirmed",
      "reschedule_requested",
      "completed",
      "cancelled",
      "expired"
    ];

    if (status && !ALLOWED.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const filters = { student: req.user.id };
    if (status) filters.status = status;

    if (from || to) {
      filters.startTime = {};
      if (from) filters.startTime.$gte = new Date(from);
      if (to) filters.startTime.$lte = new Date(to);
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const skip = (pageNum - 1) * lim;

    const [itemsRaw, total] = await Promise.all([
      Lesson.find(filters)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(lim)
        .populate('tutor', 'name avatar'),
      Lesson.countDocuments(filters),
    ]);

    // APPLY STATUS NORMALISATION
    const items = itemsRaw.map(l => {
      const o = l.toObject();
      o.status = normalizeStatus(o.status);
      return o;
    });

    res.json({
      page: pageNum,
      limit: lim,
      total,
      totalPages: Math.max(Math.ceil(total / lim), 1),
      items,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
