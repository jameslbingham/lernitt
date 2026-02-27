// /server/routes/tutors.js
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User"); 
const Availability = require("../models/Availability"); // ✅ IMPORTED

const router = express.Router();
const { auth } = require('../middleware/auth');

const visibleTutorMatch = {
  isTutor: true,
  $or: [
    { tutorStatus: "approved" },
    { tutorStatus: { $exists: false } },
  ],
};

/**
 * GET /api/tutors
 * List tutors with advanced availability signaling
 */
router.get("/", auth, async (req, res) => {
  try {
    const tutors = await User.aggregate([
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
      // ✅ SOPHISTICATION: Signal if tutor has configured a schedule
      {
        $lookup: {
          from: "availabilities",
          localField: "_id",
          foreignField: "tutor",
          as: "availabilityRecord"
        }
      },
      {
        $addFields: {
          hasLiveSchedule: { $gt: [{ $size: "$availabilityRecord" }, 0] }
        }
      },
      { $project: { reviews: 0, password: 0, availabilityRecord: 0 } },
    ]);

    res.json(tutors);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/**
 * GET /api/tutors/:id
 * Single tutor profile
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);

    const result = await User.aggregate([
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
 * Synchronizes professional onboarding and financial metadata
 */
router.patch("/setup", auth, async (req, res) => {
  try {
    if (req.user.role !== 'tutor' && !req.user.isTutor) {
      return res.status(403).json({ error: "Only tutors can access professional setup." });
    }

    const { bio, subjects, price, paypalEmail, country, timezone, introVideo, avatarUrl } = req.body;

    const updatedTutor = await User.findByIdAndUpdate(
      req.user.id,
      {
        bio,
        subjects,
        price,
        paypalEmail,
        country,
        timezone,
        introVideo,
        avatar: avatarUrl,
        tutorStatus: "pending" 
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
