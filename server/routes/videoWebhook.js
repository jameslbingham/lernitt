// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT + WEBHOOK CREATION HELPER
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch");
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

      // ✔ ALWAYS return 200 if secret is missing (Daily’s test webhook)
      if (!secret) {
        console.warn("⚠️ DAILY_WEBHOOK_SECRET is missing. Accepting test ping.");
        return res.status(200).json({ ok: true, message: "test-accepted" });
      }

      // Reject if Daily did not send a signature
      if (!signature) {
        return res.status(400).json({ ok: false, error: "missing-signature" });
      }

      // Normal signature verification once secret exists
      const computed = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (signature !== computed) {
        console.error("❌ Signature mismatch");
        return res.status(401).json({ ok: false, error: "bad-signature" });
      }

      const event = JSON.parse(req.body.toString());
      console.log("Daily webhook event:", event.type);

      const lessonId = event?.data?.object?.room?.name;
      if (!lessonId) return res.status(200).json({ ok: true });

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(200).json({ ok: true });

      // ============================================================
      // recording.ready-to-download  (Daily’s correct event)
      // ============================================================
      if (event.type === "recording.ready-to-download") {
        const recordingUrl = event?.data?.object?.download_url;
        if (!recordingUrl) return res.status(200).json({ ok: true });

        lesson.recordingStatus = "available";
        lesson.recordingUrl = recordingUrl;
        lesson.recordingActive = false;

        await lesson.save();
        return res.status(200).json({ ok: true });
      }

      // recording.error
      if (event.type === "recording.error") {
        lesson.recordingStatus = "error";
        lesson.recordingActive = false;
        await lesson.save();
        return res.status(200).json({ ok: true });
      }

      // recording.no-participants
      if (event.type === "recording.no-participants") {
        lesson.recordingStatus = "no-participants";
        lesson.recordingActive = false;
        await lesson.save();
        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ ok: false });
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

    // ✔ Use correct Daily event
    const response = await fetch("https://api.daily.co/v1/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        eventTypes: ["recording.ready-to-download"], // ← correct event
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
