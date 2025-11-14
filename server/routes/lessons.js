const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const { notify } = require('../utils/notify');
const auth = require('../middleware/auth');
const { canReschedule } = require('../utils/policies');
const validateSlot = require("../utils/validateSlot");

/* ============================================
   GET /api/lessons/tutor  
   All lessons for the logged-in tutor
   ============================================ */
router.get('/tutor', auth, async (req, res) => {
  try {
    const lessons = await Lesson.find({ tutor: req.user.id })
      .populate('student', 'name avatar')
      .sort({ startTime: 1 });

    // Normalized structure for frontend
    const out = lessons.map(l => ({
      id: String(l._id),
      student: l.student?.name || "Student",
      tutor: String(l.tutor),
      subject: l.subject,
      start: l.startTime,
      end: l.endTime,
      duration: l.durationMins,
      status: l.status,
      price: l.price,
      currency: l.currency,
      isTrial: l.isTrial,
      createdAt: l.createdAt,
      cancelledAt: l.cancelledAt,
      requestedNewDate: null,
      requestedNewTime: null,
      pendingUntil: null,
    }));

    return res.json(out);
  } catch (err) {
    console.error("GET /tutor error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================================
   Create a lesson (student booking)
   ============================================ */
router.post('/', auth, async (req, res) => {
  try {
    console.log('[BOOK] body:', req.body);

    const { tutor, subject, startTime, endTime, price, currency, notes } = req.body;

    // trial logic
    const isTrial = req.body.isTrial === true;
    if (isTrial) {
      const durMin = Math.round((new Date(endTime) - new Date(startTime)) / 60000);
      if (durMin !== 30) {
        return res.status(400).json({ message: "Trial must be 30 minutes" });
      }
      const usedWithTutor = await Lesson.exists({ student: req.user.id, tutor, isTrial: true });
      if (usedWithTutor) {
        return res.status(400).json({ message: "You already used a trial with this tutor" });
      }
      const totalTrials = await Lesson.countDocuments({ student: req.user.id, isTrial: true });
      if (totalTrials >= 3) {
        return res.status(400).json({ message: "You used all 3 free trials" });
      }
    }
    const finalPrice = isTrial ? 0 : price;

    // validate slot
    const durMins = Math.max(15, Math.round((new Date(endTime) - new Date(startTime)) / 60000));
    const chk = await validateSlot({
      tutorId: tutor,
      startISO: startTime,
      endISO: endTime,
      durMins,
    });
    if (!chk.ok) return res.status(400).json({ error: `slot-invalid:${chk.reason}` });

    // clash guard
    const clash = await Lesson.findOne({
      tutor,
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) },
      status: { $nin: ['cancelled', 'expired'] },
    });
    if (clash) return res.status(400).json({ message: 'Tutor already has a lesson at this time' });

    const lesson = new Lesson({
      tutor,
      student: req.user.id,
      subject,
      startTime,
      endTime,
      price: finalPrice,
      currency,
      notes,
      isTrial,
      status: 'booked', // NEW default lifecycle state
    });

    await lesson.save();

    await notify(
      lesson.tutor,
      'booking',
      'New lesson booked',
      'A student booked a lesson with you.',
      { lesson: lesson._id }
    );

    res.status(201).json({ _id: lesson._id });
  } catch (err) {
    console.error('[BOOK] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Student lessons (mine)
   ============================================ */
router.get('/mine', auth, async (req, res) => {
  try {
    const lessons = await Lesson.find({ student: req.user.id })
      .populate('tutor', 'name avatar')
      .sort({ startTime: -1 });
    res.json(lessons);
  } catch (err) {
    console.error('[LESSONS][mine] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Get a single lesson
   ============================================ */
router.get('/:id', auth, async (req, res) => {
  try {
    const l = await Lesson.findById(req.params.id).populate('tutor', '_id name');
    if (!l) return res.status(404).json({ message: 'Not found' });
    if (l.student.toString() !== req.user.id && l.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    res.json(l);
  } catch (err) {
    console.error('[LESSONS][getOne] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Tutor confirm (must be paid first)
   ============================================ */
router.patch('/:id/confirm', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (['cancelled', 'completed', 'expired'].includes(lesson.status)) {
      return res.status(400).json({ message: `Cannot confirm a ${lesson.status} lesson` });
    }

    let paid = lesson.isPaid === true;

    if (lesson.isTrial) paid = true;

    if (!lesson.isTrial && lesson.status === 'paid') {
      paid = true;
    }

    if (!paid && !lesson.isTrial) {
      const succeededPayment = await Payment.findOne({
        lesson: lesson._id,
        status: 'succeeded',
      }).lean();

      if (!succeededPayment) {
        return res.status(400).json({ message: 'Lesson must be paid before confirmation' });
      }

      lesson.isPaid = true;
      lesson.paidAt = lesson.paidAt || new Date();
      if (succeededPayment._id) lesson.payment = succeededPayment._id;
      paid = true;
    }

    if (!paid) {
      return res.status(400).json({ message: 'Lesson must be paid before confirmation' });
    }

    lesson.status = 'confirmed';
    await lesson.save();

    await notify(
      lesson.student,
      'confirm',
      'Lesson confirmed',
      'Your lesson was confirmed by the tutor.',
      { lesson: lesson._id }
    );

    res.json(lesson);
  } catch (err) {
    console.error('[LESSONS][confirm] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Cancel (student or tutor)
   ============================================ */
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const isStudent = lesson.student.toString() === req.user.id;
    const isTutor = lesson.tutor.toString() === req.user.id;
    if (!isStudent && !isTutor) return res.status(403).json({ message: 'Not allowed' });

    const within24h = !canReschedule(lesson);

    lesson.status = 'cancelled';
    lesson.cancelledAt = new Date();
    lesson.cancelledBy = isStudent ? 'student' : 'tutor';
    lesson.cancelReason = reason || (within24h ? 'late-cancel' : 'cancel');
    lesson.reschedulable = !within24h;

    await lesson.save();

    await notify(
      lesson.student,
      'cancel',
      'Lesson cancelled',
      'Your lesson was cancelled.',
      { lesson: lesson._id }
    );
    await notify(
      lesson.tutor,
      'cancel',
      'Lesson cancelled',
      'The student cancelled your lesson.',
      { lesson: lesson._id }
    );

    return res.json({
      ok: true,
      message: within24h
        ? 'Cancelled within 24h. No refund. No reschedule.'
        : 'Cancelled >24h. No refund. Reschedule allowed.',
      lesson,
    });
  } catch (err) {
    console.error('[LESSONS][cancel] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Complete (tutor only)
   ============================================ */
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (lesson.endTime > new Date()) {
      return res.status(400).json({ message: 'Lesson has not ended yet' });
    }

    if (['cancelled', 'completed', 'expired'].includes(lesson.status)) {
      return res.status(400).json({ message: `Cannot complete a ${lesson.status} lesson` });
    }

    lesson.status = 'completed';
    await lesson.save();

    const amountCents = Math.round((lesson.price || 0) * 100);
    if (!lesson.isTrial && amountCents > 0) {
      await Payout.create({
        lesson: lesson._id,
        tutor: lesson.tutor,
        amountCents,
        currency: lesson.currency || 'EUR',
        provider: 'stripe',
        status: 'queued',
      });
    }

    await notify(
      lesson.student,
      'complete',
      'Lesson completed',
      'Your lesson has been marked completed.',
      { lesson: lesson._id }
    );

    res.json(lesson);
  } catch (err) {
    console.error('[LESSONS][complete] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Reschedule
   ============================================ */
router.patch('/:id/reschedule', auth, async (req, res) => {
  try {
    const { newStartTime, newEndTime } = req.body || {};
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const isStudent = lesson.student.toString() === req.user.id;
    const isTutor = lesson.tutor.toString() === req.user.id;
    if (!isStudent && !isTutor) return res.status(403).json({ message: 'Not allowed' });

    if (!canReschedule(lesson)) {
      return res.status(403).json({ message: 'Cannot reschedule within 24 hours.' });
    }

    if (!newStartTime || !newEndTime) {
      return res.status(400).json({ message: 'newStartTime and newEndTime required' });
    }

    const clash = await Lesson.findOne({
      tutor: lesson.tutor,
      _id: { $ne: lesson._id },
      startTime: { $lt: new Date(newEndTime) },
      endTime: { $gt: new Date(newStartTime) },
      status: { $nin: ['cancelled', 'expired'] },
    });
    if (clash) return res.status(400).json({ message: 'Tutor has a clash at new time' });

    lesson.startTime = new Date(newStartTime);
    lesson.endTime = new Date(newEndTime);
    lesson.rescheduledAt = new Date();
    lesson.reschedulable = false;

    await lesson.save();

    await notify(
      lesson.student,
      'reschedule',
      'Lesson rescheduled',
      'Your lesson has been rescheduled.',
      { lesson: lesson._id }
    );
    await notify(
      lesson.tutor,
      'reschedule',
      'Lesson rescheduled',
      'The lesson time was changed.',
      { lesson: lesson._id }
    );

    return res.json({ ok: true, lesson });
  } catch (err) {
    console.error('[LESSONS][reschedule] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Trial summary
   ============================================ */
router.get('/trial-summary/:tutorId', auth, async (req, res) => {
  try {
    const student = req.user.id;
    const { tutorId } = req.params;
    const usedWithTutor = !!(await Lesson.exists({ student, tutor: tutorId, isTrial: true }));
    const totalTrials = await Lesson.countDocuments({ student, isTrial: true });
    res.json({ usedWithTutor, totalTrials });
  } catch (err) {
    console.error('[LESSONS][trial-summary] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
