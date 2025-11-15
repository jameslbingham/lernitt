// /server/routes/tutorLessons.js
const express = require('express');
const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const User = require('../models/User');

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
 * GET /api/tutors/lessons
 * Query: status=booked|paid|confirmed|reschedule_requested|completed|cancelled|expired
 */
router.get('/', auth, async (req, res) => {
  try {
    // ensure user is a valid tutor
    const tutor = await User.findById(req.user.id).select('_id');
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' });

    const { status, from, to } = req.query;

    // pagination
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limitRaw = Math.max(parseInt(req.query.limit || '10', 10), 1);
    const limit = Math.min(limitRaw, 100);
    const skip = (page - 1) * limit;

    // UPDATED lifecycle statuses
    const allowedStatuses = [
      "booked",
      "paid",
      "confirmed",
      "reschedule_requested",
      "completed",
      "cancelled",
      "expired"
    ];

    const filter = { tutor: req.user.id };

    // status filter
    if (status && allowedStatuses.includes(status)) {
      filter.status = status;
    }

    // date range filter
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    const total = await Lesson.countDocuments(filter);

    const lessonsRaw = await Lesson.find(filter)
      .populate('student', 'name avatar')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    // APPLY STATUS NORMALISATION
    const lessons = lessonsRaw.map(l => {
      const o = l.toObject();
      o.status = normalizeStatus(o.status);
      return o;
    });

    res.json({
      page,
      limit,
      total,
      hasPrev: page > 1,
      hasNext: skip + lessons.length < total,
      data: lessons,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
