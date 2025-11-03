const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const { notify } = require('../utils/notify');
const auth = require('../middleware/auth');
const { canReschedule } = require('../utils/policies');
const validateSlot = require("../utils/validateSlot");

// Create a lesson
router.post('/', auth, async (req, res) => {
  try {
    console.log('[BOOK] body:', req.body);

    const { tutor, subject, startTime, endTime, price, currency, notes } = req.body;

    // ✅ trial logic
    const isTrial = req.body.isTrial === true;
    if (isTrial) {
      const durMin = Math.round((new Date(endTime) - new Date(startTime)) / 60000);
      if (durMin !== 30) return res.status(400).json({ message: "Trial must be 30 minutes" });
      const usedWithTutor = await Lesson.exists({ student: req.user.id, tutor, isTrial: true });
      if (usedWithTutor) return res.status(400).json({ message: "You already used a trial with this tutor" });
      const totalTrials = await Lesson.countDocuments({ student: req.user.id, isTrial: true });
      if (totalTrials >= 3) return res.status(400).json({ message: "You used all 3 free trials" });
    }
    const finalPrice = isTrial ? 0 : price;

    // ✅ validate slot against availability + clashes
    const durMins = Math.max(15, Math.round((new Date(endTime) - new Date(startTime)) / 60000));
    const chk = await validateSlot({ tutorId: tutor, startISO: startTime, endISO: endTime, durMins });
    if (!chk.ok) return res.status(400).json({ error: `slot-invalid:${chk.reason}` });

    // extra clash guard
    const clash = await Lesson.findOne({
      tutor,
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) },
      status: { $in: ['pending', 'confirmed'] }
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my lessons
router.get('/mine', auth, async (req, res) => {
  try {
    const lessons = await Lesson.find({ student: req.user.id })
      .populate('tutor', 'name avatar')
      .sort({ startTime: -1 });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single lesson (for Pay page)
router.get('/:id', auth, async (req, res) => {
  try {
    const l = await Lesson.findById(req.params.id).populate('tutor','_id name');
    if (!l) return res.status(404).json({ message: 'Not found' });
    if (l.student.toString() !== req.user.id && l.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    res.json(l);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm a lesson (tutor only, must be paid)
router.patch('/:id/confirm', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    let paid = lesson.isPaid === true;

    // trials: no payment needed
    if (lesson.isTrial) paid = true;

    if (!paid) {
      const succeededPayment = await Payment.findOne({
        lesson: lesson._id,
        status: 'succeeded'
      }).lean();
      if (!succeededPayment) {
        return res.status(400).json({ message: 'Lesson must be paid before confirmation' });
      }
      lesson.isPaid = true;
      if (succeededPayment._id) lesson.payment = succeededPayment._id;
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel a lesson (tutor or student) with 24h policy
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
      lesson
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Complete a lesson (tutor only, after endTime)
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

    lesson.status = 'completed';
    await lesson.save();

    // Queue payout after completion (skip trials)
    const amountCents = Math.round((lesson.price || 0) * 100);
    if (!lesson.isTrial && amountCents > 0) {
      await Payout.create({
        lesson: lesson._id,
        tutor: lesson.tutor,
        amountCents,
        currency: lesson.currency || 'EUR',
        provider: 'stripe',
        status: 'queued'
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Reschedule (only if >24h before original start)
router.patch('/:id/reschedule', auth, async (req, res) => {
  try {
    const { newStartTime, newEndTime } = req.body || {};
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const isStudent = lesson.student.toString() === req.user.id;
    const isTutor = lesson.tutor.toString() === req.user.id;
    if (!isStudent && !isTutor) return res.status(403).json({ message: 'Not allowed' });

    if (!canReschedule(lesson))
      return res.status(403).json({ message: 'Cannot reschedule within 24 hours.' });

    if (!newStartTime || !newEndTime)
      return res.status(400).json({ message: 'newStartTime and newEndTime required' });

    const clash = await Lesson.findOne({
      tutor: lesson.tutor,
      _id: { $ne: lesson._id },
      startTime: { $lt: new Date(newEndTime) },
      endTime: { $gt: new Date(newStartTime) },
      status: { $in: ['pending', 'confirmed'] }
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
    return res.status(500).json({ message: 'Server error' });
  }
});

// Trial summary for current student
router.get('/trial-summary/:tutorId', auth, async (req, res) => {
  try {
    const student = req.user.id;
    const { tutorId } = req.params;
    const usedWithTutor = !!(await Lesson.exists({ student, tutor: tutorId, isTrial: true }));
    const totalTrials = await Lesson.countDocuments({ student, isTrial: true });
    res.json({ usedWithTutor, totalTrials });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
