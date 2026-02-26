// /server/routes/tutors.js
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User"); // User model

const router = express.Router();

// ✅ ADDED: Import auth function using destructuring
const { auth } = require('../middleware/auth');

// Helper: match only visible tutors
// - isTutor: true
// - tutorStatus: "approved" OR field missing (legacy tutors)
const visibleTutorMatch = {
  isTutor: true,
  $or: [
    { tutorStatus: "approved" },
    { tutorStatus: { $exists: false } },
  ],
};

/**
 * GET /api/tutors
 * List tutors ONLY with avgRating and reviewsCount
 */
router.get("/", auth, async (req, res) => {
  try {
    const tutors = await User.aggregate([
      // ✅ ONLY visible tutors
      { $match: visibleTutorMatch },

      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "tutor",
          as: "reviews",
        },
      },
      {
        $addFields: {
          avgRating: {
            $round: [{ $ifNull: [{ $avg: "$reviews.rating" }, 0] }, 2],
          },
          reviewsCount: { $size: "$reviews" },
        },
      },
      { $project: { reviews: 0 } },
    ]);

    res.json(tutors);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/**
 * GET /api/tutors/:id
 * Single tutor ONLY
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);

    const result = await User.aggregate([
      // ✅ MUST be visible tutor
      { $match: { ...visibleTutorMatch, _id: id } },

      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "tutor",
          as: "reviews",
        },
      },
      {
        $addFields: {
          avgRating: {
            $round: [{ $ifNull: [{ $avg: "$reviews.rating" }, 0] }, 2],
          },
          reviewsCount: { $size: "$reviews" },
        },
      },
      { $project: { reviews: 0 } },
      { $limit: 1 },
    ]);

    if (!result.length) {
      return res.status(404).json({ error: "Tutor not found" });
    }

    res.json(result[0]);
  } catch (err) {
    res.status(400).json({ error: "Invalid tutor id" });
  }
});

/**
 * PATCH /api/tutors/setup
 * ✅ NEW: Allows a newly signed-up tutor to save their professional profile
 * This connects the "Signup" process to the "Payment" logic.
 */
router.patch("/setup", auth, async (req, res) => {
  try {
    // Check if the user is actually a tutor
    if (!req.user.role === 'tutor' && !req.user.isTutor) {
      return res.status(403).json({ error: "Only tutors can access professional setup." });
    }

    const { bio, subjects, price, paypalEmail, country, timezone } = req.body;

    // Update the tutor's record with the professional details
    const updatedTutor = await User.findByIdAndUpdate(
      req.user.id,
      {
        bio,
        subjects,
        price,
        paypalEmail,
        country,
        timezone,
        tutorStatus: "pending" // Sets them to pending so Admin Bob can review
      },
      { new: true, runValidators: true }
    );

    if (!updatedTutor) {
      return res.status(404).json({ error: "Tutor profile not found." });
    }

    res.json({
      message: "Professional profile saved successfully!",
      user: updatedTutor.summary()
    });

  } catch (err) {
    console.error("Tutor Setup Error:", err);
    res.status(500).json({ error: "Failed to save profile details." });
  }
});

module.exports = router;
