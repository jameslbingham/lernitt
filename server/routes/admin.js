/**
 * LERNITT ACADEMY - ADMINISTRATIVE CONTROL HUB v4.2.2
 * ----------------------------------------------------------------------------
 * This module provides high-privilege endpoints for platform governance:
 * - USER AUDITING: Full visibility into student and tutor profiles.
 * - LESSON OVERSEEING: Monitoring and manual reschedule management.
 * - DISPUTE RESOLUTION: Processing and resolving academic conflicts.
 * - TUTOR APPROVAL: Vetting instructors and managing marketplace access.
 * ----------------------------------------------------------------------------
 */

const express = require('express');
const router = express.Router();

/**
 * MIDDLEWARE INTEGRATION
 * ✅ VERIFIED: Destructuring 'auth' from the middleware object to ensure 
 * compatibility with your project's security pattern.
 */
const { auth } = require('../middleware/auth');

/**
 * MODEL IMPORTS
 * Mapping to the core data structures for academy management.
 */
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Dispute = require('../models/Dispute');

/**
 * COMMUNICATION UTILITY
 * ✅ INTEGRATED: Required to trigger dual-channel (App + Email) tutor alerts.
 */
const { notify } = require('../utils/notify');

/**
 * MIDDLEWARE: isAdmin
 * ✅ VERIFIED: Local implementation to strictly verify 'isAdmin: true' in MongoDB.
 * Ensures that metrics and financial data are restricted to Bob only.
 */
async function isAdmin(req, res, next) {
  try {
    const me = await User.findById(req.user.id).select('isAdmin');
    if (!me || !me.isAdmin) {
      return res.status(403).json({ error: 'Administrative access restricted.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Identity verification failed.' });
  }
}

/* ==========================================================================
   SECTION 1: USER DIRECTORY AUDITING
   ========================================================================== */

/**
 * GET /api/admin/users
 * ✅ Logic Preserved: Fetches all academic accounts while sanitizing passwords.
 */
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Internal failure retrieving user directory.' });
  }
});

/* ==========================================================================
   SECTION 2: ACADEMIC LESSON LOGS
   ========================================================================== */

/**
 * GET /api/admin/lessons
 * ✅ Logic Preserved: Unified visibility into scheduled and historical sessions.
 */
router.get('/lessons', auth, isAdmin, async (req, res) => {
  try {
    const lessons = await Lesson.find().populate(
      'student tutor',
      'name email'
    );
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: 'Failed to access academic lesson registry.' });
  }
});

/* ==========================================================================
   SECTION 3: CONFLICT & DISPUTE RESOLUTION
   ========================================================================== */

/**
 * GET /api/admin/disputes
 * ✅ Logic Preserved: Retrieval of active student-tutor dispute records.
 */
router.get('/disputes', auth, isAdmin, async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('user', 'name email')
      .populate('lesson', 'subject startTime endTime status')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ error: 'Error accessing academic dispute logs.' });
  }
});

/**
 * GET /api/admin/disputes/:id
 * ✅ Logic Preserved: Metadata view for a specific conflict incident.
 */
router.get('/disputes/:id', auth, isAdmin, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('user', 'name email')
      .populate('lesson', 'subject startTime endTime status');
    
    if (!dispute) {
      return res.status(404).json({ error: 'Conflict record not found.' });
    }
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ error: 'Internal failure retrieving dispute details.' });
  }
});

/**
 * PATCH /api/admin/disputes/:id/status
 * ✅ Logic Preserved: Bob manually resolves or rejects active disputes.
 */
router.patch('/disputes/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status, resolution = '' } = req.body || {};
    if (!['resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid resolution status provided.' });
    }

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { $set: { status, resolution } },
      { new: true }
    )
      .populate('user', 'name email')
      .populate('lesson', 'subject startTime endTime status');

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute record missing.' });
    }

    res.json(dispute);
  } catch (e) {
    console.error('[ADMIN][DISPUTE][STATUS] failure:', e);
    res.status(500).json({ error: 'Failed to update dispute status.' });
  }
});

/**
 * DELETE /api/admin/disputes/:id
 * ✅ Logic Preserved: Removing stale or incorrect dispute records.
 */
router.delete('/disputes/:id', auth, isAdmin, async (req, res) => {
  try {
    const deleted = await Dispute.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Record not found for deletion.' });
    }
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to purge record.' });
  }
});

/* ==========================================================================
   SECTION 4: LESSON RESCHEDULE OVERRIDES
   ========================================================================== */

/**
 * PATCH /api/admin/lessons/:id/reschedule
 * ✅ Logic Preserved: Bob overrides rescheduling logic for edge cases.
 */
router.patch(
  '/lessons/:id/reschedule',
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { status } = req.body || {};
      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: 'Invalid override decision.' });
      }

      const lesson = await Lesson.findByIdAndUpdate(
        req.params.id,
        { $set: { rescheduleStatus: status } },
        { new: true }
      ).populate('student tutor', 'name email');

      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found for update.' });
      }
      res.json(lesson);
    } catch (e) {
      console.error('[ADMIN][LESSON][RESCHEDULE] failure:', e);
      res.status(500).json({ error: 'Internal failure during reschedule override.' });
    }
  }
);

/* ==========================================================================
   SECTION 5: TUTOR INTAKE & APPROVAL WORKFLOW
   ========================================================================== */

/**
 * GET /api/admin/tutors
 * ✅ Logic Preserved: Filters applicant list by pending/approved status.
 */
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
    console.error('[ADMIN][TUTORS][LIST] failure:', e);
    res.status(500).json({ error: 'Failed to retrieve applicant directory.' });
  }
});

/**
 * PATCH /api/admin/tutors/:id/status
 * ✅ INTEGRATED: Now triggers SendGrid notification via the notify utility.
 */
router.patch('/tutors/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['pending', 'approved', 'rejected', 'none'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid application status decision.' });
    }

    const tutor = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { tutorStatus: status } },
      { new: true }
    ).select('name email role isTutor tutorStatus');

    if (!tutor || !tutor.isTutor) {
      return res.status(404).json({ error: 'Instructor record missing.' });
    }

    /**
     * NOTIFICATION AUTOMATION
     * ✅ Triggers App alert and Inbox delivery via SendGrid.
     */
    try {
      const title = status === 'approved' 
        ? "Application Approved!" 
        : "Application Status Update";
        
      const msg = status === 'approved' 
        ? `Welcome ${tutor.name}! Your Lernitt application is approved. You can now set your availability and accept global students.`
        : "Thank you for applying. We cannot approve your tutor application at this stage.";

      await notify(tutor._id, 'system', title, msg);
    } catch (notifyErr) {
      console.warn("[ADMIN] Notification failed, but status update succeeded.");
    }

    res.json(tutor);
  } catch (e) {
    console.error('[ADMIN][TUTORS][STATUS] failure:', e);
    res.status(500).json({ error: 'Failure during applicant vetting process.' });
  }
});

module.exports = router;
