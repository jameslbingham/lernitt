// /server/routes/video.js
const express = require("express");
const fetch = require("node-fetch");
const Lesson = require("../models/Lesson");

const router = express.Router();

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const API_BASE = "https://api.daily.co/v1";

/* ---------------- DAILY API HELPER ---------------- */
async function dailyFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(JSON.stringify(data || { status: res.status }));
  }

  return data;
}

/* ---------------- CREATE ROOM ---------------- */
router.post("/create-room", async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) {
      return res.status(400).json({ error: "lessonId is required" });
    }

    const body = {
      name: `lesson-${lessonId}-${Date.now()}`,
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        eject_after_elapsed_seconds: 7200,
      },
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    };

    const data = await dailyFetch("/rooms", {
      method: "POST",
      body: JSON.stringify(body),
    });

    res.json({ roomUrl: data.url });
  } catch (err) {
    console.error("create-room error:", err.message || err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

/* ---------------- START RECORDING ---------------- */
router.post("/start-recording", async (req, res) => {
  try {
    const { roomUrl, lessonId } = req.body || {};
    if (!roomUrl) {
      return res.status(400).json({ error: "roomUrl is required" });
    }
    if (!lessonId) {
      return res.status(400).json({ error: "lessonId is required" });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const body = {
      room_url: roomUrl,
      layout: { preset: "default" },
    };

    const recording = await dailyFetch("/recordings/start", {
      method: "POST",
      body: JSON.stringify(body),
    });

    // ✅ Save metadata
    lesson.recordingId = recording.id || null;
    lesson.recordingStartedBy = req.user?.id || null; // optional (no auth middleware yet)
    await lesson.save();

    res.json({ recording });
  } catch (err) {
    console.error("start-recording error:", err.message || err);
    res.status(500).json({ error: "Could not start recording" });
  }
});

/* ---------------- STOP RECORDING ---------------- */
router.post("/stop-recording", async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) {
      return res.status(400).json({ error: "lessonId is required" });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const recording = await dailyFetch("/recordings/stop", {
      method: "POST",
    });

    // ✅ Clear metadata
    lesson.recordingId = null;
    lesson.recordingStartedBy = null;
    await lesson.save();

    res.json({ recording });
  } catch (err) {
    console.error("stop-recording error:", err.message || err);
    res.status(500).json({ error: "Could not stop recording" });
  }
});

/* ---------------- COMPLETE LESSON ---------------- */
router.post("/complete-lesson", async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) {
      return res.status(400).json({ error: "lessonId is required" });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    lesson.status = "completed";
    lesson.endTime = new Date();
    await lesson.save();

    res.json({
      ok: true,
      lesson: lesson.summary ? lesson.summary() : lesson,
    });
  } catch (err) {
    console.error("complete-lesson error:", err.message || err);
    res.status(500).json({ error: "Failed to complete lesson" });
  }
});

module.exports = router;
