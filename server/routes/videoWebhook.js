// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT + WEBHOOK CREATION HELPER
// - Signature verification (with “no-secret-yet” fallback for first test ping)
// - recording.* events (will be expanded in later steps)
// - Helper route to create webhook on Daily via REST API
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const Lesson = require("../models/Lesson");
const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/video/webhook
// Main webhook endpoint called by Daily
// ---------------------------------------------------------------------------
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["daily-signature"];
      const secret = process.env.DAILY_WEBHOOK_SECRET;

      // If Daily didn't sign the request, reject it.
      if (!signature) {
        return res.status(400).end();
      }

      // SPECIAL CASE: first test ping, before we know the secret.
      // Daily already knows the HMAC, but we don't yet.
      // Accept the request so Daily considers the endpoint healthy.
      if (!secret) {
        console.warn(
          "Daily webhook hit but DAILY_WEBHOOK_SECRET is not set yet. " +
            "Accepting request so webhook creation can succeed."
        );
        return res.status(200).end();
      }

      // Verify signature (normal path once secret is set)
      const computed = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (signature !== computed) {
        console.error("Daily webhook: signature mismatch");
        return res.status(401).end();
      }

      // Parse event body
      const event = JSON.parse(req.body.toString());
      console.log("Daily webhook event:", event.type);

      const lessonId = event?.data?.object?.room?.name;
      if (!lessonId) return res.status(200).end(); // acknowledge anyway

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(200).end();

      // ============================================================
      // STEP 2: RECORDING FINISHED (placeholder – will be improved)
      // ============================================================
      if (event.type === "recording.finished") {
        const recordingUrl = event?.data?.object?.download_url;

        if (!recordingUrl) {
          console.error("Missing download_url for recording.finished");
          return res.status(200).end();
        }

        lesson.recordingStatus = "available";
        lesson.recordingUrl = recordingUrl;
        lesson.recordingActive = false;

        await lesson.save();
        console.log(`🎥 Recording complete for lesson ${lessonId}`);

        return res.status(200).end();
      }

      // ============================================================
      // STEP 3A: RECORDING ERROR
      // ============================================================
      if (event.type === "recording.error") {
        lesson.recordingStatus = "error";
        lesson.recordingActive = false;

        await lesson.save();
        console.error(`❌ Recording ERROR for lesson ${lessonId}`);

        return res.status(200).end();
      }

      // ============================================================
      // STEP 3B: NO PARTICIPANTS
      // ============================================================
      if (event.type === "recording.no-participants") {
        lesson.recordingStatus = "no-participants";
        lesson.recordingActive = false;

        await lesson.save();
        console.log(`⚠️ Recording NO PARTICIPANTS for lesson ${lessonId}`);

        return res.status(200).end();
      }

      // Acknowledge all other events (ignored for now)
      return res.status(200).end();
    } catch (err) {
      console.error("Daily webhook error:", err);
      return res.status(500).end();
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/video/webhook/create
// Helper: creates a Daily webhook pointing at /api/video/webhook
// ---------------------------------------------------------------------------
router.get("/webhook/create", async (req, res) => {
  try {
    const apiKey = process.env.DAILY_API_KEY;

    if (!apiKey) {
      return res
        .status(500)
        .json({ ok: false, error: "DAILY_API_KEY is missing in environment" });
    }

    const webhookUrl = "https://lernitt.onrender.com/api/video/webhook";

    const response = await axios.post(
      "https://api.daily.co/v1/webhooks",
      {
        url: webhookUrl,
        // We’ll refine event types later if needed
        eventTypes: ["recording.finished", "recording.error"],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { hmac, uuid, eventTypes } = response.data || {};

    return res.json({
      ok: true,
      message:
        "Webhook created on Daily. COPY the `hmac` value into DAILY_WEBHOOK_SECRET on Render, then redeploy.",
      webhookUuid: uuid,
      eventTypes,
      hmac,
    });
  } catch (err) {
    console.error(
      "Error creating Daily webhook:",
      err.response?.data || err.message
    );
    return res.status(500).json({
      ok: false,
      error: "Failed to create webhook. Check logs on Render for details.",
    });
  }
});

module.exports = router;
