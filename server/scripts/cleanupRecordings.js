/**
 * cleanupRecordings.js
 * ---------------------------------------------------------------
 * Deletes lesson recordings older than 30 days.
 *
 * This ONLY clears lesson.recordingUrl + lesson.recordingId
 * from MongoDB. It does NOT delete anything from Daily or Supabase.
 *
 * This script is safe to run daily on Render Cron.
 * ---------------------------------------------------------------
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Lesson = require("../models/Lesson");

// ---------------------------------------------------------------
// 1. CONNECT TO MONGODB
// ---------------------------------------------------------------
async function init() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI missing");
    process.exit(1);
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("✅ Connected to MongoDB");
}

// ---------------------------------------------------------------
// 2. CLEANUP FUNCTION
// ---------------------------------------------------------------
async function cleanup() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  console.log("🧹 Starting cleanup…");
  console.log("Deleting recordings older than:", cutoff.toISOString());

  const lessons = await Lesson.find({
    recordingUrl: { $exists: true, $ne: null },
    endTime: { $lte: cutoff },
  });

  if (lessons.length === 0) {
    console.log("No recordings to clean.");
    return;
  }

  console.log(`Found ${lessons.length} lessons with old recordings.`);

  for (const lesson of lessons) {
    console.log(`→ Clearing recording for lesson ${lesson._id}`);

    lesson.recordingUrl = null;
    lesson.recordingId = null;
    lesson.recordingStatus = "expired";
    await lesson.save();
  }

  console.log("✨ Cleanup finished.");
}

// ---------------------------------------------------------------
// 3. RUN + EXIT SAFELY
// ---------------------------------------------------------------
(async () => {
  try {
    await init();
    await cleanup();
  } catch (err) {
    console.error("❌ Cleanup error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected. Done.");
    process.exit(0);
  }
})();
