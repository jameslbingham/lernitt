// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT + WEBHOOK CREATION HELPER
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch"); // ← using node-fetch instead of axios
const Lesson = require("../models/Lesson");
const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/video/webhook
// ---------------------------------------------------------------------------
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["daily-signature"];
      const secret = process.env.DAILY_WEBHOOK_SECRET;

      if (!signature) return res.status(400).end();

      if (!secret) {
        console.warn(
          "Daily webhook hit but DAILY_WEBHOOK_SECRET is not set yet."
        );
        return res.status(200).end();
      }

      const computed = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (signature !== computed) {
        console.error("Daily webhook: signature mismatch");
        return res.status(401).end();
      }

      const event = JSON.parse(req.body.toString());
      console.log("Daily webhook event:", event.type);

      const lessonId = event?.data?.object?.room?.name;
      if (!lessonId) return res.status(200).end();

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(200).end();

      if (event.type === "recording.finished") {
        const recordingUrl = event?.data?.object?.download_url;
        if (!recordingUrl) return res.status(200).end();

        lesson.recordingStatus = "available";
        lesson.recordingUrl = recordingUrl;
        lesson.recordingActive = false;

        await lesson.save();
        console.log(`🎥 Recording complete for lesson ${lessonId}`);
        return res.status(200).end();
      }

      if (event.type === "recording.error") {
        lesson.recordingStatus = "error";
        lesson.recordingActive = false;
        await lesson.save();
        return res.status(200).end();
      }

      if (event.type === "recording.no-participants") {
        lesson.recordingStatus = "no-participants";
        lesson.recordingActive = false;
        await lesson.save();
        return res.status(200).end();
      }

      return res.status(200).end();
    } catch (err) {
      console.error("Daily webhook error:", err);
      return res.status(500).end();
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/video/webhook/create — create webhook on Daily (uses fetch)
// ---------------------------------------------------------------------------
router.get("/webhook/create", async (req, res) => {
  try {
    const apiKey = process.env.DAILY_API_KEY;

    if (!apiKey) {
      return res
        .status(500)
        .json({ ok: false, error: "DAILY_API_KEY missing" });
    }

    const webhookUrl = "https://lernitt.onrender.com/api/video/webhook";

    const response = await fetch("https://api.daily.co/v1/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        eventTypes: ["recording.finished", "recording.error"],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error creating webhook:", data);
      return res.status(500).json({ ok: false, error: data });
    }

    return res.json({
      ok: true,
      message:
        "Webhook created. COPY the `hmac` value into DAILY_WEBHOOK_SECRET on Render.",
      webhookUuid: data.uuid,
      eventTypes: data.eventTypes,
      hmac: data.hmac,
    });
  } catch (err) {
    console.error("Webhook creation error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
