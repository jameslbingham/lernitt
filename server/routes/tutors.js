// /server/routes/tutors.js
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer"); // Added for video file handling
const User = require("../models/User"); 
const Availability = require("../models/Availability");
const { supabase } = require("../utils/supabaseClient"); // Added for Supabase storage

const router = express.Router();
const { auth } = require('../middleware/auth');

// Configure multer for memory storage (temporary holding for the video)
const upload = multer({ storage: multer.memoryStorage() });

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
 * POST /api/tutors/register
 * Handles the multi-part form including the video upload to Supabase
 * MANDATORY: Uses Flat Path for tutor-videos bucket.
 */
router.post("/register", auth, upload.single('video'), async (req, res) => {
  try {
    const { full_name, bio, subjects, hourly_rate } = req.body;
    let videoUrl = "";

    // 1. Handle Video Upload to Supabase if file exists
    if (req.file) {
      // Create a clean filename: tutorID-timestamp-originalName
      const fileName = `${req.user.id}-${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('tutor-videos')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Generate the Public URL
      const { data: publicUrlData } = supabase.storage
        .from('tutor-videos')
        .getPublicUrl(fileName);
        
      videoUrl = publicUrlData.publicUrl;
    }

    // 2. Update the User profile in MongoDB
    const updatedTutor = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: full_name,
          bio: bio,
          subjects: subjects ? subjects.split(',').map(s => s.trim()) : [],
          price: Number(hourly_rate) || 0,
          introVideo: videoUrl,
          tutorStatus: "pending", // Bob needs to review the video
          isTutor: true
        }
      },
      { new: true }
    );

    res.status(200).json({
      message: "Application submitted successfully!",
      videoUrl: videoUrl,
      user: updatedTutor.summary()
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: "Failed to process application", details: err.message });
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

    const updateData = {
      bio: bio || "",
      subjects: Array.isArray(subjects) ? subjects : [],
      price: Number(price) || 0,
      paypalEmail: paypalEmail || "",
      country: country || "",
      timezone: timezone || "UTC",
      tutorStatus: "pending" 
    };

    if (introVideo) updateData.introVideo = introVideo;
    if (avatarUrl) updateData.avatar = avatarUrl;

    const updatedTutor = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
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
    res.status(500).json({ error: "Failed to save profile details. Ensure price is a number." });
  }
});

module.exports = router;
