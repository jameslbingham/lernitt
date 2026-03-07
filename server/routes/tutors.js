// /server/routes/tutors.js
/**
 * ============================================================================
 * LERNITT ACADEMY - TUTOR ARCHITECTURE & MARKETPLACE LOGIC
 * ============================================================================
 * ROLE: Senior Developer Audit - Step 2 (Availability Plumbing)
 * VERSION: 4.1.0
 * ----------------------------------------------------------------------------
 * This file serves as the primary "Pipe System" for all tutor-related data.
 * It manages three distinct streams of information:
 * * 1. THE MARKETPLACE: Fetching and filtering approved tutors for students.
 * 2. THE ONBOARDING: Handling video uploads to Supabase and profile updates.
 * 3. THE SCHEDULING: Managing the internal "plumbing" for tutor availability.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - COMPLETE FILES ONLY: No truncation permitted.
 * - BUSINESS LOGIC PRESERVATION: Existing marketplace aggregation must remain.
 * - FLAT PATH RULE: Storage buckets must not use folder prefixes.
 * ============================================================================
 */

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer"); // Added for video file handling
const User = require("../models/User"); 
const Availability = require("../models/Availability"); // ✅ IMPORTED
const { supabase } = require("../utils/supabaseClient"); // Added for Supabase storage

const router = express.Router();
const { auth } = require('../middleware/auth');

// Configure multer for memory storage (temporary holding for the video)
// We hold the video in the server's RAM just long enough to pass it to Supabase.
const upload = multer({ storage: multer.memoryStorage() });

/**
 * SOPHISTICATED MARKETPLACE LOGIC
 * ----------------------------------------------------------------------------
 * Only tutors marked as 'approved' or those legacy tutors without a status
 * are visible to students in the public marketplace.
 * ----------------------------------------------------------------------------
 */
const visibleTutorMatch = {
  isTutor: true,
  $or: [
    { tutorStatus: "approved" },
    { tutorStatus: { $exists: false } },
  ],
};

/**
 * GET /api/tutors
 * List tutors with advanced availability signaling and review aggregation.
 * Performs a complex multi-stage aggregation to calculate ratings on the fly.
 * * PLUMBING CHECK: 
 * This route "joins" the User data with the Review data and Availability data.
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
      // This is the "Read Pipe" that tells the marketplace if a tutor is ready.
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
    console.error("MARKETPLACE FETCH ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/**
 * GET /api/tutors/:id
 * Single tutor profile fetch with rating projection.
 * Used when a student clicks on a specific tutor's profile.
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
 * Handles the multi-part form including the video upload to Supabase.
 * MANDATORY: Uses Flat Path for tutor-videos bucket.
 * * PLUMBING CHECK: 
 * 1. Sends video to Supabase Storage.
 * 2. Receives a URL back.
 * 3. Saves that URL into the User's MongoDB profile.
 */
router.post("/register", auth, upload.single('video'), async (req, res) => {
  try {
    const { full_name, bio, subjects, hourly_rate } = req.body;
    let videoUrl = "";

    // 1. Handle Video Upload to Supabase if file exists
    if (req.file) {
      // Create a clean filename: tutorID-timestamp-originalName
      // VITAL: No folder prefixes are added here (Flat Path Rule).
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
          isTutor: true,
          role: "tutor" // Officially promote them to prevent dashboard entry rejection
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
    console.error("REGISTRATION PLUMBING ERROR:", err);
    res.status(500).json({ error: "Failed to process application", details: err.message });
  }
});

/**
 * PATCH /api/tutors/setup
 * Synchronizes professional onboarding and financial metadata.
 * ----------------------------------------------------------------------------
 * VITAL FIX: 
 * 1. Promotes role to 'tutor' so new accounts can pass dashboard auth.
 * 2. Uses Defensive Guards (|| "") to ensure MongoDB doesn't reject partial saves.
 * ----------------------------------------------------------------------------
 */
router.patch("/setup", auth, async (req, res) => {
  try {
    // Extract fields from the incoming payload
    const { bio, subjects, price, paypalEmail, country, timezone, introVideo, avatarUrl } = req.body;

    // Build the update object with Defensive Logic
    const updateData = {
      bio: bio || "",
      subjects: Array.isArray(subjects) ? subjects : [],
      price: Number(price) || 0,
      paypalEmail: paypalEmail || "",
      country: country || "",
      timezone: timezone || "UTC",
      tutorStatus: "pending", // Queues for Bob's review
      isTutor: true,
      role: "tutor" // MANDATORY: Promote user so they can immediately access the Tutor Dashboard
    };

    // Surgical Media Handling: Only add if URLs are provided
    if (introVideo) updateData.introVideo = introVideo;
    if (avatarUrl) updateData.avatar = avatarUrl;

    const updatedTutor = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTutor) {
      return res.status(404).json({ error: "Tutor profile not found in database." });
    }

    // Return the cleaned summary so the dashboard can load without crashing
    res.json({
      message: "Professional profile saved successfully!",
      user: updatedTutor.summary()
    });

  } catch (err) {
    console.error("TUTOR SETUP CRITICAL ERROR:", err);
    res.status(500).json({ error: "Failed to save profile details. Ensure price is a number." });
  }
});

/**
 * ✅ NEW PLUMBING: GET /api/tutors/availability/me
 * ----------------------------------------------------------------------------
 * This is the "FETCH" pipe. It allows the tutor's dashboard to load their
 * existing schedule from the MongoDB database. 
 * Without this, the page would show up blank every time the tutor refreshes.
 * ----------------------------------------------------------------------------
 */
router.get("/availability/me", auth, async (req, res) => {
  try {
    // We look for the availability record that belongs to the logged-in tutor.
    const availability = await Availability.findOne({ tutor: req.user.id });
    
    if (!availability) {
      // If they haven't set a schedule yet, we send back a clean slate.
      return res.json({ weekly: [], timezone: "UTC", bookingNotice: 12 });
    }
    
    // Send the data back to the frontend page (Availability.jsx).
    res.json(availability);
  } catch (err) {
    console.error("AVAILABILITY FETCH ERROR:", err);
    res.status(500).json({ error: "Plumbing error: Could not load your schedule." });
  }
});

/**
 * ✅ NEW PLUMBING: PUT /api/tutors/availability
 * ----------------------------------------------------------------------------
 * This is the "SAVE" pipe. It connects Availability.jsx to the Database.
 * This endpoint allows tutors to synchronize their weekly schedule grids
 * directly with MongoDB. It uses 'findOneAndUpdate' to ensure we don't
 * create duplicate schedule records for the same tutor.
 * ----------------------------------------------------------------------------
 */
router.put("/availability", auth, async (req, res) => {
  try {
    const { weekly, timezone, bookingNotice } = req.body;
    
    // We update the existing record OR create a new one if it's their first time.
    const updated = await Availability.findOneAndUpdate(
      { tutor: req.user.id },
      { 
        $set: { 
          weekly, 
          timezone, 
          bookingNotice, 
          tutor: req.user.id,
          updatedAt: new Date()
        } 
      },
      { upsert: true, new: true }
    );

    res.json({ 
      message: "Availability synchronized! Students can now see your schedule.", 
      data: updated 
    });
  } catch (err) {
    console.error("AVAILABILITY SYNC ERROR:", err);
    res.status(500).json({ error: "Plumbing error: Could not save schedule to database." });
  }
});

module.exports = router;
