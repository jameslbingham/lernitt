// /server/routes/admin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Dispute = require('../models/Dispute');

// Admin check (reads DB)
async function isAdmin(req, res, next) {
  try {
    const me = await User.findById(req.user.id).select('isAdmin');
    if (!me || !me.isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Auth error' });
  }
}

// GET /api/admin/users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/lessons
router.get('/lessons', auth, isAdmin, async (req, res) => {
  try {
    const lessons = await Lesson.find().populate(
      'student tutor',
      'name email'
    );
    res.json(lessons);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/disputes (list)
router.get('/disputes', auth, isAdmin, async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('user', 'name email')
      .populate('lesson', 'subject startTime endTime status')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/disputes/:id (single)
router.get('/disputes/:id', auth, isAdmin, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('user', 'name email')
      .populate('lesson', 'subject startTime endTime status');
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    res.json(dispute);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/disputes/:id/status
// Body: { status: "resolved" | "rejected", resolution?: string }
router.patch('/disputes/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status, resolution = '' } = req.body || {};
    if (!['resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { $set: { status, resolution } },
      { new: true }
    )
      .populate('user', 'name email')
      .populate('lesson', 'subject startTime endTime status');

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(dispute);
  } catch (e) {
    console.error('[ADMIN][DISPUTE][STATUS] error=', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/disputes/:id
router.delete('/disputes/:id', auth, isAdmin, async (req, res) => {
  try {
    const deleted = await Dispute.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    res.json({ ok: true, id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ================================
   NEW: Lesson reschedule approve/deny
   ================================ */
// PATCH /api/admin/lessons/:id/reschedule
// Body: { status: "approved" | "denied" }
router.patch(
  '/lessons/:id/reschedule',
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { status } = req.body || {};
      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const lesson = await Lesson.findByIdAndUpdate(
        req.params.id,
        { $set: { rescheduleStatus: status } },
        { new: true }
      ).populate('student tutor', 'name email');

      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      res.json(lesson);
    } catch (e) {
      console.error('[ADMIN][LESSON][RESCHEDULE] error=', e);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/* ================================
   NEW: Tutor approval workflow
   ================================ */

// GET /api/admin/tutors?status=pending|approved|rejected|none
router.get('/tutors', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.query || {};
    const match = { isTutor: true };

    const allowed = ['pending', 'approved', 'rejected', 'none'];
    if (status && allowed.includes(status)) {
      match.tutorStatus = status;
    }

    const tutors = await User.find(match).select(
      'name email role isTutor tutorStatus subjects languages hourlyRate price createdAt'
    );

    res.json(tutors);
  } catch (e) {
    console.error('[ADMIN][TUTORS][LIST] error=', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/tutors/:id/status
// Body: { status: "pending" | "approved" | "rejected" | "none" }
router.patch('/tutors/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['pending', 'approved', 'rejected', 'none'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const tutor = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { tutorStatus: status } },
      { new: true }
    ).select('name email role isTutor tutorStatus');

    if (!tutor || !tutor.isTutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    res.json(tutor);
  } catch (e) {
    console.error('[ADMIN][TUTORS][STATUS] error=', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
