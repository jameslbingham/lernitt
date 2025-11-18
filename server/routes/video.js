// /server/routes/video.js
const express = require("express");
const fetch = require("node-fetch");
const Lesson = require("../models/Lesson");
const auth = require("../middleware/auth.js");

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

/* ====================================================================== */
/* ---------------- CREATE TOKEN FOR JOINING A DAILY ROOM --------------- */
/* ====================================================================== */
router.post("/token", auth, async (req, res) => {
  try {
    const { roomName, role } = req.body; // role = 'owner' or 'participant'

    if (!roomName || !role) {
      return res.status(400).json({ error: "roomName and role required" });
    }

    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: role === "owner",
        },
      }),
    });

    const token = await tokenRes.json();
    return res.json(token);
  } catch (err) {
    console.error("Token error:", err);
    res.status(500).json({ error: "Token creation failed" });
  }
});

/* ---------------- ACCESS TOKEN (EXISTING DAILY VERSION) ---------------- */
router.post("/access-token", auth, async (req, res) => {
  try {
    const { lessonId, roomUrl } = req.body || {};
    if (!lessonId || !roomUrl) {
      return res
        .status(400)
        .json({ error: "lessonId and roomUrl are required" });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const userId = String(req.user._id);
    const isTutor = userId === String(lesson.tutor);
    const isStudent = userId === String(lesson.student);

    if (!isTutor && !isStudent) {
      return res.status(403).json({ error: "Not allowed for this lesson" });
    }

    // Get room name from the URL
    let roomName = null;
    try {
      const urlObj = new URL(roomUrl);
      roomName = urlObj.pathname.replace(/^\/+/, "");
    } catch {
      roomName = null;
    }

    if (!roomName) {
      return res.status(400).json({ error: "Invalid roomUrl" });
    }

    const tokenResponse = await dailyFetch("/meeting-tokens", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: isTutor,
          user_name: isTutor ? "Tutor" : "Student",
        },
      }),
    });

    return res.json({ token: tokenResponse.token });
  } catch (err) {
    console.error("access-token error:", err.message || err);
    return res.status(500).json({ error: "Could not create access token" });
  }
});

/* ---------------- START RECORDING ---------------- */
router.post("/start-recording", auth, async (req, res) => {
  try {
    const { roomUrl, lessonId } = req.body || {};
    if (!roomUrl || !lessonId) {
      return res.status(400).json({ error: "roomUrl and lessonId required" });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const body = {
      room_url: roomUrl,
      layout: { preset: "default" },
    };

    const recording = await dailyFetch("/recordings/start", {
      method: "POST",
      body: JSON.stringify(body),
    });

    lesson.recordingActive = true;
    lesson.recordingId = recording.id || null;
    lesson.recordingStartedBy = String(req.user._id);
    lesson.recordingStopVotes = { tutor: false, student: false };
    await lesson.save();

    res.json({
      recording,
      recordingState: {
        active: true,
        id: recording.id || null,
        startedBy: lesson.recordingStartedBy,
        stopVotes: lesson.recordingStopVotes,
      },
    });
  } catch (err) {
    console.error("start-recording error:", err.message || err);
    res.status(500).json({ error: "Could not start recording" });
  }
});

/* ---------------- REQUEST STOP RECORDING ---------------- */
router.post("/request-stop-recording", auth, async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ error: "lessonId required" });

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    if (!lesson.recordingActive)
      return res.status(400).json({ error: "No active recording" });

    const userId = String(req.user._id);
    const isTutor = userId === String(lesson.tutor);
    const isStudent = userId === String(lesson.student);

    if (isTutor) lesson.recordingStopVotes.tutor = true;
    if (isStudent) lesson.recordingStopVotes.student = true;

    // Auto-stop if both agree
    if (lesson.recordingStopVotes.tutor && lesson.recordingStopVotes.student) {
      await dailyFetch("/recordings/stop", { method: "POST" });
      lesson.recordingActive = false;
      lesson.recordingStartedBy = null;
      lesson.recordingId = null;
      lesson.recordingStopVotes = { tutor: false, student: false };
    }

    await lesson.save();

    res.json({
      ok: true,
      recordingState: {
        active: lesson.recordingActive,
        startedBy: lesson.recordingStartedBy,
        stopVotes: lesson.recordingStopVotes,
      },
    });
  } catch (err) {
    console.error("request-stop-recording error:", err.message || err);
    res.status(500).json({ error: "Could not update stop vote" });
  }
});

/* ---------------- CANCEL STOP VOTE ---------------- */
router.post("/cancel-stop-vote", auth, async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ error: "lessonId required" });

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const userId = String(req.user._id);
    const isTutor = userId === String(lesson.tutor);
    const isStudent = userId === String(lesson.student);

    if (isTutor) lesson.recordingStopVotes.tutor = false;
    if (isStudent) lesson.recordingStopVotes.student = false;

    await lesson.save();

    res.json({
      ok: true,
      recordingState: {
        active: lesson.recordingActive,
        startedBy: lesson.recordingStartedBy,
        stopVotes: lesson.recordingStopVotes,
      },
    });
  } catch (err) {
    console.error("cancel-stop-vote error:", err.message || err);
    res.status(500).json({ error: "Could not cancel vote" });
  }
});

/* ---------------- STOP RECORDING (MANUAL) ---------------- */
router.post("/stop-recording", auth, async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ error: "lessonId required" });

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    if (!lesson.recordingActive)
      return res.status(400).json({ error: "No active recording" });

    if (!(lesson.recordingStopVotes.tutor && lesson.recordingStopVotes.student)) {
      return res.status(403).json({
        error: "Recording can only be stopped when both participants agree.",
      });
    }

    await dailyFetch("/recordings/stop", { method: "POST" });

    lesson.recordingActive = false;
    lesson.recordingStartedBy = null;
    lesson.recordingId = null;
    lesson.recordingStopVotes = { tutor: false, student: false };
    await lesson.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("stop-recording error:", err.message || err);
    res.status(500).json({ error: "Could not stop recording" });
  }
});

/* ---------------- COMPLETE LESSON ---------------- */
router.post("/complete-lesson", auth, async (req, res) => {
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
