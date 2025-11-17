// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT (FULL + COMPLETE)
// Includes:
// - Signature verification
// - recording.finished
// - recording.error
// - recording.no-participants
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const Lesson = require("../models/Lesson");
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

      const lessonId = event?.data?.object?.room?.name;
      if (!lessonId) return res.status(200).end(); // acknowledge anyway

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(200).end();

      // ============================================================
      // STEP 2: RECORDING FINISHED
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

module.exports = router;
