// /server/routes/disputes.js
const express = require('express');
const router = express.Router();
const { auth } = require("../middleware/auth");
const Dispute = require('../models/Dispute');

// POST /api/disputes (student or tutor creates dispute)
router.post('/', auth, async (req, res) => {
  try {
    const { lessonId, reason } = req.body;
    if (!lessonId || !reason) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const dispute = await Dispute.create({
      lesson: lessonId,
      user: req.user.id,
      reason
    });

    res.status(201).json(dispute);
  } catch (e) {
    console.error('[DISPUTES][POST] error=', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/disputes/mine (list my disputes)
router.get('/mine', auth, async (req, res) => {
  try {
    const disputes = await Dispute.find({ user: req.user.id })
      .populate('lesson', 'subject startTime endTime status')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (e) {
    console.error('[DISPUTES][MINE] error=', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
