// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT (FULL + COMPLETE) — WITH recording.finished HANDLER
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const Lesson = require("../models/Lesson"); // ✅ needed for DB updates
const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["daily-signature"];
      const secret = process.env.DAILY_WEBHOOK_SECRET;

      if (!signature || !secret) return res.status(400).end();

      // Verify signature
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

      // ============================================================
      // STEP 2: HANDLE recording.finished
      // ============================================================
      if (event.type === "recording.finished") {
        const lessonId = event?.data?.object?.room?.name; 
        // IMPORTANT:
        // room.name == lessonId   (we designed create-room that way)

        const recordingUrl = event?.data?.object?.download_url;

        if (!lessonId || !recordingUrl) {
          console.error("Missing lessonId or recordingUrl");
          return res.status(200).end(); // acknowledge anyway
        }

        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
          console.error("Lesson not found for recording.finished");
          return res.status(200).end(); // acknowledge to Daily
        }

        // Update lesson recording fields
        lesson.recordingStatus = "available";
        lesson.recordingUrl = recordingUrl;
        lesson.recordingActive = false;

        await lesson.save();

        console.log(`🎥 Recording complete for lesson ${lessonId}`);
        return res.status(200).end();
      }

      // ============================================================
      // FUTURE: recording.started, recording.error, no-participants
      // ============================================================

      return res.status(200).end();
    } catch (err) {
      console.error("Daily webhook error:", err);
      return res.status(500).end();
    }
  }
);

module.exports = router;
