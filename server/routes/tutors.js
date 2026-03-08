/**
 * ============================================================================
 * LERNITT ACADEMY - TUTOR ARCHITECTURE & MARKETPLACE LOGIC
 * ============================================================================
 * ROLE: Senior Developer Master Sync - Problem 5 (Temporal Shield Integration)
 * VERSION: 4.3.0
 * ----------------------------------------------------------------------------
 * This file serves as the primary "Pipe System" for all tutor-related data.
 * It manages four distinct streams of information:
 * 1. THE MARKETPLACE: Fetching and filtering approved tutors for students.
 * 2. THE ONBOARDING: Handling video uploads to Supabase and profile updates.
 * 3. THE SCHEDULING: Managing the internal "plumbing" for tutor availability.
 * 4. THE SLOT GENERATOR: ✅ NEW! Bridges the Tutor's clock with the Student's UI.
 * ----------------------------------------------------------------------------
 * ✅ PROBLEM 5 FIX: Timezone Harmonization.
 * Logic: Implements the 'GET /:id/slots' valve to ensure students only see
 * times that are logically valid in the tutor's specific IANA timezone.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - COMPLETE FILES ONLY: No truncation permitted.
 * - BUSINESS LOGIC PRESERVATION: Marketplace aggregation and flat-path remain.
 * - FLAT PATH RULE: Storage buckets must not use folder prefixes.
 * ============================================================================
 */

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer"); 
const { DateTime } = require("luxon"); // ✅ VITAL: Required for Problem 5 math
const User = require("../models/User"); 
const Availability = require("../models/Availability"); 
const { supabase } = require("../utils/supabaseClient"); 

const router = express.Router();
const { auth } = require('../middleware/auth');

// Configure multer for memory storage (temporary holding for the video)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * SOPHISTICATED MARKETPLACE LOGIC
 * ----------------------------------------------------------------------------
 * ✅ STRICT VETTING: Only tutors explicitly 'approved' are visible.
 * ----------------------------------------------------------------------------
 */
const visibleTutorMatch = {
  isTutor: true,
  tutorStatus: "approved"
};

/**
 * GET /api/tutors
 * List tutors with advanced availability signaling and review aggregation.
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
    console.error("MARKETPLACE FETCH ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/**
 * GET /api/tutors/:id
 * Single tutor profile fetch with rating projection.
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
      return res.status(404).json({ error: "Tutor profile not found or not yet approved." });
    }

    res.json(result[0]);
  } catch (err) {
    res.status(400).json({ error: "Invalid tutor identification badge." });
  }
});

/**
 * ✅ NEW: GET /api/tutors/:id/slots
 * ROLE: The "Clock Harmonizer" for Problem 5.
 * Logic: Generates a list of available ISO strings for the student's UI.
 * Sync: Aligned with validateSlot.js to prevent temporal clashes.
 */
router.get("/:id/slots", async (req, res) => {
  try {
    const { from, to, dur, tz } = req.query;
    const tutorId = req.params.id;

    const avail = await Availability.findOne({ tutor: tutorId });
    if (!avail) return res.json({ slots: [] });

    const tutorTz = avail.timezone || "UTC";
    const studentTz = tz || "UTC";
    const duration = parseInt(dur) || 60;

    // Boundary Logic: Convert incoming request times to the tutor's local perspective
    let currentDay = DateTime.fromISO(from).setZone(tutorTz).startOf('day');
    const endBound = DateTime.fromISO(to).setZone(tutorTz);
    
    const slots = [];

    while (currentDay < endBound) {
      const isoDate = currentDay.toISODate();
      
      // Check for Exceptions first
      const ex = (avail.exceptions || []).find(e => e.date === isoDate);
      let ranges = [];
      
      if (ex) {
        ranges = ex.open ? (ex.ranges || []) : [];
      } else {
        const dow = currentDay.weekday === 7 ? 0 : currentDay.weekday;
        const dayConfig = avail.weekly.find(w => w.dow === dow);
        ranges = dayConfig ? dayConfig.ranges : [];
      }

      ranges.forEach(r => {
        let rStart = currentDay.set({ 
          hour: +r.start.slice(0, 2), 
          minute: +r.start.slice(3, 5),
          second: 0, millisecond: 0 
        });
        
        let rEnd = currentDay.set({ 
          hour: +r.end.slice(0, 2), 
          minute: +r.end.slice(3, 5),
          second: 0, millisecond: 0 
        });

        // ✅ MIDNIGHT SHIELD: If range crosses 00:00, push end to next day
        if (rEnd <= rStart) rEnd = rEnd.plus({ days: 1 });

        // Slot Engine: Generate valid start-times in 30-min increments
        let slotPtr = rStart;
        while (slotPtr.plus({ minutes: duration }) <= rEnd) {
          // Force UTC for the database handshake, but frontend will localize for student
          slots.push(slotPtr.toUTC().toISO());
          slotPtr = slotPtr.plus({ minutes: 30 });
        }
      });

      currentDay = currentDay.plus({ days: 1 });
    }

    // Filter out historical slots (anything in the past)
    const nowUTC = DateTime.now().toUTC();
    const finalSlots = slots.filter(s => DateTime.fromISO(s) > nowUTC);

    res.json({ slots: finalSlots });
  } catch (err) {
    console.error("SLOT GENERATION FAILURE:", err);
    res.status(500).json({ error: "Temporal slot directory sync failed." });
  }
});

/**
 * POST /api/tutors/register
 * Handles multi-part form and Supabase video handshake.
 */
router.post("/register", auth, upload.single('video'), async (req, res) => {
  try {
    const { full_name, bio, subjects, hourly_rate } = req.body;
    let videoUrl = "";

    if (req.file) {
      const fileName = `${req.user.id}-${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
      const { data, error: uploadError } = await supabase.storage
        .from('tutor-videos')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('tutor-videos').getPublicUrl(fileName);
      videoUrl = publicUrlData.publicUrl;
    }

    const updatedTutor = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: full_name,
          bio: bio,
          subjects: subjects ? subjects.split(',').map(s => s.trim()) : [],
          price: Number(hourly_rate) || 0,
          introVideo: videoUrl,
          tutorStatus: "pending", 
          isTutor: true,
          role: "tutor" 
        }
      },
      { new: true }
    );

    res.status(200).json({
      message: "Application submitted successfully! Bob (Admin) will review your intro video shortly.",
      videoUrl: videoUrl,
      user: updatedTutor.summary()
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to process application", details: err.message });
  }
});

/**
 * PATCH /api/tutors/setup
 * Synchronizes professional onboarding and financial metadata.
 */
router.patch("/setup", auth, async (req, res) => {
  try {
    const { bio, subjects, price, paypalEmail, country, timezone, introVideo, avatarUrl } = req.body;

    const updateData = {
      bio: bio || "",
      subjects: Array.isArray(subjects) ? subjects : [],
      price: Number(price) || 0,
      paypalEmail: paypalEmail || "",
      country: country || "",
      timezone: timezone || "UTC",
      tutorStatus: "pending", 
      isTutor: true,
      role: "tutor" 
    };

    if (introVideo) updateData.introVideo = introVideo;
    if (avatarUrl) updateData.avatar = avatarUrl;

    const updatedTutor = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTutor) return res.status(404).json({ error: "Profile lost." });

    res.json({
      message: "Professional profile saved!",
      user: updatedTutor.summary()
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to save profile details." });
  }
});

/**
 * GET /api/tutors/availability/me
 */
router.get("/availability/me", auth, async (req, res) => {
  try {
    const availability = await Availability.findOne({ tutor: req.user.id });
    if (!availability) return res.json({ weekly: [], timezone: "UTC", bookingNotice: 12 });
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: "Plumbing error: Could not load your schedule." });
  }
});

/**
 * PUT /api/tutors/availability
 */
router.put("/availability", auth, async (req, res) => {
  try {
    const { weekly, timezone, bookingNotice } = req.body;
    
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

    res.json({ message: "Availability synchronized!", data: updated });
  } catch (err) {
    res.status(500).json({ error: "Plumbing error: Could not save schedule." });
  }
});

module.exports = router;
