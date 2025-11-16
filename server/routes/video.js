// /server/routes/video.js
const express = require("express");

const router = express.Router();

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const API_BASE = "https://api.daily.co/v1";

// Simple helper for Daily API using built-in fetch
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
    const msg = data || { status: res.status, statusText: res.statusText };
    throw new Error(JSON.stringify(msg));
  }

  return data;
}

// -------------------------------------------------------
// POST /api/video/create-room
// Creates a room for this lesson (30-day expiry)
// -------------------------------------------------------
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
        eject_after_elapsed_seconds: 7200, // 2 hours safety
      },
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    };

    const data = await dailyFetch("/rooms", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return res.json({ roomUrl: data.url });
  } catch (err) {
    console.error("create-room error", err.message || err);
    return res.status(500).json({ error: "Failed to create room" });
  }
});

// -------------------------------------------------------
// POST /api/video/start-recording
// Tutor OR student can start
// -------------------------------------------------------
router.post("/start-recording", async (req, res) => {
  try {
    const { roomUrl } = req.body || {};

    if (!roomUrl) {
      return res.status(400).json({ error: "roomUrl is required" });
    }

    const body = {
      room_url: roomUrl,
      layout: { preset: "default" },
    };

    const recording = await dailyFetch("/recordings/start", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return res.json({ recording });
  } catch (err) {
    console.error("Start recording error:", err.message || err);
    return res.status(500).json({ error: "Could not start recording" });
  }
});

// -------------------------------------------------------
// POST /api/video/stop-recording
// Backend allows stop; frontend enforces owner-only
// -------------------------------------------------------
router.post("/stop-recording", async (_req, res) => {
  try {
    const recording = await dailyFetch("/recordings/stop", {
      method: "POST",
    });

    return res.json({ recording });
  } catch (err) {
    console.error("Stop recording error:", err.message || err);
    return res.status(500).json({ error: "Could not stop recording" });
  }
});

module.exports = router;
