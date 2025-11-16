// /server/routes/video.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const API_BASE = "https://api.daily.co/v1";

// -------------------------------------------------------
// Helper: Daily API Client
// -------------------------------------------------------
function daily() {
  return axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
  });
}

// -------------------------------------------------------
// POST /api/video/create-room
// Creates a room for this lesson (30-day expiry)
// -------------------------------------------------------
router.post("/create-room", async (req, res) => {
  try {
    const { lessonId } = req.body;

    const response = await daily().post("/rooms", {
      name: `lesson-${lessonId}-${Date.now()}`,
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        eject_after_elapsed_seconds: 7200
      },
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 // 30 days
    });

    return res.json({ roomUrl: response.data.url });
  } catch (err) {
    console.error("create-room error", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to create room" });
  }
});

// -------------------------------------------------------
// POST /api/video/start-recording
// Tutor OR student can start
// -------------------------------------------------------
router.post("/start-recording", async (req, res) => {
  try {
    const { roomUrl } = req.body;

    const result = await daily().post("/recordings/start", {
      room_url: roomUrl,
      layout: { preset: "default" }
    });

    return res.json({ recording: result.data });
  } catch (err) {
    console.error("Start recording error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Could not start recording" });
  }
});

// -------------------------------------------------------
// POST /api/video/stop-recording
// Tutor OR student can attempt to stop
// (frontend enforces owner-only rule)
// -------------------------------------------------------
router.post("/stop-recording", async (_req, res) => {
  try {
    const result = await daily().post("/recordings/stop");
    return res.json({ recording: result.data });
  } catch (err) {
    console.error("Stop recording error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Could not stop recording" });
  }
});

module.exports = router;
