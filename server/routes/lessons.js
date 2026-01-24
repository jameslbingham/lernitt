const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // ✅ ADDED FOR TRANSACTIONS
const Lesson = require('../models/Lesson');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const { notify } = require('../utils/notify');
const { auth } = require("../middleware/auth");
const { canReschedule } = require('../utils/policies');
const validateSlot = require("../utils/validateSlot");
const User = require('../models/User'); // ✅ NEW: to check tutorStatus

/* --------------------------
   Normalize old/legacy statuses
   -------------------------- */
function normalizeStatus(status) {
  const raw = (status || "").toLowerCase();

  // Valid new statuses
  const allowed = [
    "booked",
    "paid",
    "confirmed",
    "completed",
    "cancelled",
    "expired",
    "reschedule_requested"
  ];
  if (allowed.includes(raw)) return raw;

  // Legacy → new mappings
  if (raw === "pending") return "booked";
  if (raw === "not_approved") return "cancelled";
  if (raw === "reschedule_pending") return "reschedule_requested";

  // Default fallback
  return "booked";
}

/* Terminal helper */
function isTerminalStatus(status) {
  return ['cancelled', 'completed', 'expired'].includes(status);
}

/* ============================================
   GET /api/lessons/tutor
   ============================================ */
router.get('/tutor', auth, async (req, res) => {
  try {
    const lessons = await Lesson.find({ tutor: req.user.id })
      .populate('student', 'name avatar')
      .sort({ startTime: 1 });

    const out = lessons.map((l) => ({
      _id: String(l._id),
      studentName: l.student?.name || "Student",
      tutor: String(l.tutor),
      subject: l.subject,
      start: l.startTime,
      startTime: l.startTime,
      end: l.endTime,
      duration: l.durationMins,
      status: normalizeStatus(l.status),
      price: l.price,
      currency: l.currency,
      isTrial: l.isTrial,
      aiSummary: l.aiSummary, // ✅ ADDED: Explicitly pass AI summary to tutor dashboard
      createdAt: l.createdAt,
      cancelledAt: l.cancelledAt,
    }));

    return res.json(out);
  } catch (err) {
    console.error("GET /tutor error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================================
   Create a lesson (student booking)
   status: 'booked' (student booked; payment required)
   ✅ UPDATED WITH TRANSACTION GUARD
   ============================================ */
router.post('/', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('[BOOK] body:', req.body);

    const { tutor, subject, startTime, endTime, price, currency, notes } = req.body;

    // ✅ Guard: only approved tutors can be booked
    const tutorUser = await User.findById(tutor).select('role tutorStatus').session(session);
    if (! tutorUser) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Tutor not found' });
    }
    if (tutorUser.role !== 'tutor') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'User is not a tutor' });
    }
    if (tutorUser.tutorStatus !== 'approved') {
      await session.abortTransaction();
      return res.status(403).json({
        message: 'This tutor is not approved for bookings yet',
      });
    }

    // trial logic
    const isTrial = req.body.isTrial === true;
    if (isTrial) {
      const durMin = Math.round((new Date(endTime) - new Date(startTime)) / 60000);
      if (durMin !== 30) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Trial must be 30 minutes" });
      }
      const usedWithTutor = await Lesson.exists({ student: req.user.id, tutor, isTrial: true }).session(session);
      if (usedWithTutor) {
        await session.abortTransaction();
        return res.status(400).json({ message: "You already used a trial with this tutor" });
      }
      const totalTrials = await Lesson.countDocuments({ student: req.user.id, isTrial: true }).session(session);
      if (totalTrials >= 3) {
        await session.abortTransaction();
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
    if (!chk.ok) {
      await session.abortTransaction();
      return res.status(400).json({ error: `slot-invalid:${chk.reason}` });
    }

    // clash guard
    const clash = await Lesson.findOne({
      tutor,
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) },
      status: { $nin: ['cancelled', 'expired'] },
    }).session(session);

    if (clash) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Tutor already has a lesson at this time' });
    }

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
      status: 'booked', // student booked; payment required
    });

    await lesson.save({ session });
    await session.commitTransaction();

    await notify(
      lesson.tutor,
      'booking',
      'New lesson booked',
      'A student booked a lesson with you.',
      { lesson: lesson._id }
    );

    res.status(201).json({ _id: lesson._id });
  } catch (err) {
    await session.abortTransaction();
    console.error('[BOOK] error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    session.endSession();
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

    const out = lessons.map((l) => ({
      ...l.toObject(),
      status: normalizeStatus(l.status),
      // aiSummary is automatically included via toObject()
    }));

    res.json(out);
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
    if (! l) return res.status(404).json({ message: 'Not found' });
    if (l.student.toString() !== req.user.id && l.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const out = l.toObject();
    out.status = normalizeStatus(out.status);
    // aiSummary is automatically included via toObject()

    res.json(out);
  } catch (err) {
    console.error('[LESSONS][getOne] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Tutor confirm (paid → confirmed)
   ============================================ */
router.patch('/:id/confirm', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (! lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (isTerminalStatus(lesson.status)) {
      return res.status(400).json({ message: `Cannot confirm a ${lesson.status} lesson` });
    }

    let paid = lesson.isPaid === true;

    if (lesson.isTrial) paid = true;
    if (! lesson.isTrial && lesson.status === 'paid') paid = true;

    if (! paid) {
      const succeededPayment = await Payment.findOne({
        lesson: lesson._id,
        status: 'succeeded',
      }).lean();
      if (! succeededPayment) {
        return res.status(400).json({ message: 'Lesson must be paid before confirmation' });
      }

      lesson.isPaid = true;
      lesson.paidAt = lesson.paidAt || new Date();
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
    console.error('[LESSONS][confirm] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Tutor rejects → cancelled
   ============================================ */
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (! lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (isTerminalStatus(lesson.status)) {
      return res.status(400).json({ message: `Cannot reject a ${lesson.status} lesson` });
    }

    lesson.status = 'cancelled';
    lesson.cancelledAt = new Date();
    lesson.cancelledBy = 'tutor';
    lesson.cancelReason = 'tutor-reject';
    lesson.reschedulable = false;

    await lesson.save();

    await notify(
      lesson.student,
      'cancel',
      'Lesson cancelled by tutor',
      'Your lesson was cancelled by the tutor.',
      { lesson: lesson._id }
    );

    res.json({ ok: true, lesson });
  } catch (err) {
    console.error('[LESSONS][reject] error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Cancel lesson
   ============================================ */
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const lesson = await Lesson.findById(req.params.id);
    if (! lesson) return res.status(404).json({ message: 'Lesson not found' });

    const isStudent = lesson.student.toString() === req.user.id;
    const isTutor = lesson.tutor.toString() === req.user.id;
    if (! isStudent && ! isTutor) return res.status(403).json({ message: 'Not allowed' });

    const within24h = ! canReschedule(lesson);

    lesson.status = 'cancelled';
    lesson.cancelledAt = new Date();
    lesson.cancelledBy = isStudent ? 'student' : 'tutor';
    lesson.cancelReason = reason || (within24h ? 'late-cancel' : 'cancel');
    lesson.reschedulable = ! within24h;

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
   Complete → completed
   ✅ FIXED: Added 15% commission + dynamic Payout provider
   ============================================ */
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (! lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (lesson.endTime > new Date()) {
      return res.status(400).json({ message: 'Lesson has not ended yet' });
    }

    if (isTerminalStatus(lesson.status)) {
      return res.status(400).json({ message: `Cannot complete a ${lesson.status} lesson` });
    }

    lesson.status = 'completed';
    await lesson.save();

    // 💰 COMMISSION CALCULATION (85% to Tutor, 15% to Lernitt)
    const rawAmountCents = Math.round((lesson.price || 0) * 100);
    const tutorTakeHomeCents = Math.floor(rawAmountCents * 0.85);

    if (! lesson.isTrial && tutorTakeHomeCents > 0) {
      // 🏦 Find tutor to check their preferred payout method
      const tutorUser = await User.findById(lesson.tutor);
      const provider = tutorUser?.paypalEmail ? 'paypal' : 'stripe';

      await Payout.create({
        lesson: lesson._id,
        tutor: lesson.tutor,
        amountCents: tutorTakeHomeCents,
        currency: lesson.currency || 'EUR',
        provider,
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
   Request reschedule
   → reschedule_requested
   ============================================ */
router.patch('/:id/reschedule', auth, async (req, res) => {
  try {
    const { newStartTime, newEndTime } = req.body || {};
    const lesson = await Lesson.findById(req.params.id);
    if (! lesson) return res.status(404).json({ message: 'Lesson not found' });

    const isStudent = lesson.student.toString() === req.user.id;
    const isTutor = lesson.tutor.toString() === req.user.id;
    if (! isStudent && ! isTutor) return res.status(403).json({ message: 'Not allowed' });

    if (! canReschedule(lesson)) {
      return res.status(403).json({ message: 'Cannot reschedule within 24 hours.' });
    }

    if (! newStartTime || ! newEndTime) {
      return res.status(400).json({ message: 'newStartTime and newEndTime required' });
    }

    if (isTerminalStatus(lesson.status)) {
      return res.status(400).json({ message: `Cannot reschedule a ${lesson.status} lesson` });
    }

    // validate slot
    const durMins = Math.max(
      15,
      Math.round((new Date(newEndTime) - new Date(newStartTime)) / 60000)
    );
    const chk = await validateSlot({
      tutorId: lesson.tutor,
      startISO: newStartTime,
      endISO: newEndTime,
      durMins,
    });
    if (! chk.ok) return res.status(400).json({ error: `slot-invalid:${chk.reason}` });

    const clash = await Lesson.findOne({
      tutor: lesson.tutor,
      _id: { $ne: lesson._id },
      startTime: { $lt: new Date(newEndTime) },
      endTime: { $gt: new Date(newStartTime) },
      status: { $nin: ['cancelled', 'expired'] },
    });
    if (clash) return res.status(400).json({ message: 'Tutor has a clash at new time' });

    lesson.pendingStartTime = new Date(newStartTime);
    lesson.pendingEndTime = new Date(newEndTime);
    lesson.status = 'reschedule_requested';
    lesson.rescheduleRequestedAt = new Date();
    lesson.rescheduleRequestedBy = isStudent ? 'student' : 'tutor';

    await lesson.save();

    await notify(
      lesson.tutor,
      'reschedule',
      'Reschedule requested',
      'A new lesson time has been requested.',
      { lesson: lesson._id }
    );
    await notify(
      lesson.student,
      'reschedule',
      'Reschedule requested',
      'Your reschedule request has been sent to the tutor.',
      { lesson: lesson._id }
    );

    return res.json({ ok: true, lesson });
  } catch (err) {
    console.error('[LESSONS][reschedule] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Approve reschedule
   reschedule_requested → confirmed
   ============================================ */
router.patch('/:id/reschedule-approve', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (! lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (lesson.status !== 'reschedule_requested') {
      return res.status(400).json({ message: 'No reschedule request to approve' });
    }

    if (! lesson.pendingStartTime || ! lesson.pendingEndTime) {
      return res.status(400).json({ message: 'Missing pending reschedule times' });
    }

    lesson.startTime = lesson.pendingStartTime;
    lesson.endTime = lesson.pendingEndTime;
    lesson.pendingStartTime = undefined;
    lesson.pendingEndTime = undefined;
    lesson.rescheduleRequestedAt = undefined;
    lesson.rescheduleRequestedBy = undefined;
    lesson.rescheduledAt = new Date();
    lesson.reschedulable = false;
    lesson.status = 'confirmed';

    await lesson.save();

    await notify(
      lesson.student,
      'reschedule',
      'Reschedule approved',
      'Your new lesson time has been approved.',
      { lesson: lesson._id }
    );

    res.json({ ok: true, lesson });
  } catch (err) {
    console.error('[LESSONS][reschedule-approve] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Reject reschedule
   reschedule_requested → confirmed (original time)
   ============================================ */
router.patch('/:id/reschedule-reject', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (! lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.tutor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (lesson.status !== 'reschedule_requested') {
      return res.status(400).json({ message: 'No reschedule request to reject' });
    }

    lesson.pendingStartTime = undefined;
    lesson.pendingEndTime = undefined;
    lesson.rescheduleRequestedAt = undefined;
    lesson.rescheduleRequestedBy = undefined;
    lesson.status = 'confirmed';

    await lesson.save();

    await notify(
      lesson.student,
      'reschedule',
      'Reschedule rejected',
      'The tutor kept the original lesson time.',
      { lesson: lesson._id }
    );

    res.json({ ok: true, lesson });
  } catch (err) {
    console.error('[LESSONS][reschedule-reject] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================
   Expire overdue
   ============================================ */
router.patch('/expire-overdue', auth, async (req, res) => {
  try {
    const now = new Date();
    const query = {
      tutor: req.user.id,
      endTime: { $lt: now },
      status: { $nin: ['cancelled', 'completed', 'expired'] },
    };

    const result = await Lesson.updateMany(query, {
      $set: { status: 'expired' },
    });

    const modified =
      typeof result.modifiedCount === 'number'
        ? result.modifiedCount
        : result.nModified || 0;

    return res.json({ ok: true, updated: modified });
  } catch (err) {
    console.error('[LESSONS][expire-overdue] error:', err);
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
