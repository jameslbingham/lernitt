// /server/routes/tutorLessons.js
const express = require('express');
const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/tutors/lessons
 * Query: status=pending|confirmed|completed|cancelled, from=ISO, to=ISO, page=1, limit=10
 */
router.get('/', auth, async (req, res) => {
  try {
    // ensure user exists
    const tutor = await User.findById(req.user.id).select('_id');
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' });

    const { status, from, to } = req.query;

    // pagination
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limitRaw = Math.max(parseInt(req.query.limit || '10', 10), 1);
    const limit = Math.min(limitRaw, 100);
    const skip = (page - 1) * limit;

    const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const filter = { tutor: req.user.id };

    // status filter
    if (status && allowedStatuses.includes(status)) {
      filter.status = status;
    }

    // date range filter on startTime
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    const total = await Lesson.countDocuments(filter);

    const lessons = await Lesson.find(filter)
      .populate('student', 'name avatar')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

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
