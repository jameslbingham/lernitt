// /server/routes/video.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

// Load Daily API key from env
const DAILY_API_KEY = process.env.DAILY_API_KEY;

// Safety check
if (!DAILY_API_KEY) {
  console.warn("⚠️ DAILY_API_KEY is missing in environment variables.");
}

/**
 * POST /api/video/create-room
 * Creates a Daily room for a lesson.
 */
router.post("/create-room", async (req, res) => {
  try {
    const { lessonId } = req.body || {};

    if (!lessonId) {
      return res.status(400).json({ error: "lessonId is required" });
    }

    // Daily room settings (customisable later)
    const body = {
      name: `lesson-${lessonId}`,
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        lang: "en",
      },
      privacy: "private",
    };

    const response = await axios.post(
      "https://api.daily.co/v1/rooms",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      }
    );

    // Return the room URL for frontend use
    res.json({
      roomUrl: response.data.url,
      roomName: response.data.name,
    });
  } catch (err) {
    console.error("Daily room creation error:", err.response?.data || err);
    res.status(500).json({
      error: "Failed to create Daily room",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
