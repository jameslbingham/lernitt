// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT (FULL + COMPLETE)
// This file is self-contained. No further pasting required.
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// NOTE:
// Daily requires express.raw() for webhooks. Do NOT use express.json() here.
// Keep this route in its own file to avoid breaking other JSON routes.

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["daily-signature"];
      const secret = process.env.DAILY_WEBHOOK_SECRET;

      // Missing secret or signature → reject
      if (!signature || !secret) {
        return res.status(400).end();
      }

      // Compute expected signature
      const computed = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      // Compare signatures
      if (signature !== computed) {
        console.error("Daily webhook: signature mismatch");
        return res.status(401).end();
      }

      // Parse the event data
      const event = JSON.parse(req.body.toString());
      console.log("Daily webhook event:", event.type);

      // -----------------------------------------------------------------------
      // TODO (next steps, not part of this file):
      // Handle the following events:
      // • recording.started
      // • recording.finished  → update lesson.recordingStatus + recordingUrl
      // • recording.error
      // • recording.no-participants
      // -----------------------------------------------------------------------

      return res.status(200).end();
    } catch (err) {
      console.error("Daily webhook error:", err);
      return res.status(500).end();
    }
  }
);

module.exports = router;
