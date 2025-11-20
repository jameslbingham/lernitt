// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT + WEBHOOK CREATION HELPER
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const { sendEmail } = require("../utils/sendEmail");
const supabase = require("../utils/supabaseClient"); // ← NEW: Supabase client
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

      // Reject if missing signature
      if (!signature) {
        return res.status(400).json({ ok: false, error: "missing-signature" });
      }

      // Validate signature
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

      // ---------------------------------------------------------------------
      // FIXED LESSON ID EXTRACTION
      // Room name is "lesson-<lessonId>-timestamp"
      // ---------------------------------------------------------------------
      const roomName = event?.data?.object?.room?.name;
      if (!roomName) return res.status(200).json({ ok: true });

      let lessonId = null;
      try {
        const parts = roomName.split("-");
        lessonId = parts[1]; // real Mongo _id
      } catch (e) {
        console.error("Could not extract lessonId from roomName:", roomName);
        lessonId = null;
      }

      if (!lessonId) return res.status(200).json({ ok: true });

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(200).json({ ok: true });

      // ============================================================
      // recording.ready-to-download
      // ============================================================
      if (event.type === "recording.ready-to-download") {
        const recordingUrl = event?.data?.object?.download_url;
        if (!recordingUrl) return res.status(200).json({ ok: true });

        // ------------------------------------------------------------
        // NEW: Download from Daily and upload to Supabase
        // ------------------------------------------------------------
        let finalUrl = recordingUrl; // fallback if upload fails

        try {
          const fileResp = await fetch(recordingUrl);
          if (!fileResp.ok) {
            throw new Error(
              `Download failed: ${fileResp.status} ${fileResp.statusText}`
            );
          }

          const arrayBuffer = await fileResp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const filePath = `lesson-recordings/${lessonId}-${Date.now()}.mp4`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("tutor-videos") // your bucket
            .upload(filePath, buffer, {
              contentType: "video/mp4",
              upsert: false,
            });

          if (uploadError) {
            console.error("Supabase upload error:", uploadError);
          } else if (uploadData) {
            const { data: publicData } = supabase.storage
              .from("tutor-videos")
              .getPublicUrl(filePath);

            if (publicData?.publicUrl) {
              finalUrl = publicData.publicUrl;
            }
          }
        } catch (uploadErr) {
          console.error("Recording transfer (Daily → Supabase) error:", uploadErr);
        }

        // Save recording URL on lesson (Supabase if upload succeeded)
        lesson.recordingStatus = "uploaded";
        lesson.recordingUrl = finalUrl;
        lesson.recordingActive = false;
        await lesson.save();

        // ------------------------------------------------------------
        // Email tutor + student
        // ------------------------------------------------------------
        try {
          const tutor = await User.findById(lesson.tutor);
          const student = await User.findById(lesson.student);

          const subject = "Your Lernitt lesson recording is ready";
          const text = `
Your lesson recording is ready for viewing.

Lesson ID: ${lessonId}
Recording link: ${finalUrl}

Please save this link or file for your records.

– Lernitt
          `;

          if (tutor?.email) {
            await sendEmail({ to: tutor.email, subject, text });
          }

          if (student?.email) {
            await sendEmail({ to: student.email, subject, text });
          }

          console.log("📧 Recording email sent to tutor + student");
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }

        return res.status(200).json({ ok: true });
      }

      // ============================================================
      // recording.error
      // ============================================================
      if (event.type === "recording.error") {
        lesson.recordingStatus = "error";
        lesson.recordingActive = false;
        await lesson.save();
        return res.status(200).json({ ok: true });
      }

      // ============================================================
      // recording.no-participants
      // ============================================================
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
// GET /api/video/webhook/create — create webhook on Daily
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
        eventTypes: ["recording.ready-to-download"],
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
