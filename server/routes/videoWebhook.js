// server/routes/videoWebhook.js
// ============================================================================
// DAILY WEBHOOK ENDPOINT — NOW TRIGGERING AI ACADEMIC SECRETARY
// ============================================================================

const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const { sendEmail } = require("../utils/sendEmail");
const supabase = require("../utils/supabaseClient");
// ✅ ADDED: Gemini Service for AI analysis
const geminiService = require("../utils/geminiService"); 

const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["daily-signature"];
      const secret = process.env.DAILY_WEBHOOK_SECRET;

      if (!secret) {
        console.warn("⚠️ DAILY_WEBHOOK_SECRET is missing. Accepting test ping.");
        return res.status(200).json({ ok: true, message: "test-accepted" });
      }

      if (!signature) {
        return res.status(400).json({ ok: false, error: "missing-signature" });
      }

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

      const roomName = event?.data?.object?.room?.name;
      if (!roomName) return res.status(200).json({ ok: true });

      let lessonId = null;
      try {
        const parts = roomName.split("-");
        lessonId = parts[1];
      } catch (e) {
        console.error("Could not extract lessonId from roomName:", roomName);
        lessonId = null;
      }

      if (!lessonId) return res.status(200).json({ ok: true });

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(200).json({ ok: true });

      // ============================================================
      // recording.ready-to-download -> Start AI Process
      // ============================================================
      if (event.type === "recording.ready-to-download") {
        const recordingUrl = event?.data?.object?.download_url;
        if (!recordingUrl) return res.status(200).json({ ok: true });

        let finalUrl = recordingUrl;

        try {
          const fileResp = await fetch(recordingUrl);
          if (!fileResp.ok) throw new Error(`Download failed: ${fileResp.status}`);

          const arrayBuffer = await fileResp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const filePath = `lesson-recordings/${lessonId}-${Date.now()}.mp4`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("tutor-videos")
            .upload(filePath, buffer, { contentType: "video/mp4", upsert: false });

          if (uploadError) {
            console.error("Supabase upload error:", uploadError);
          } else if (uploadData) {
            const { data: publicData } = supabase.storage.from("tutor-videos").getPublicUrl(filePath);
            if (publicData?.publicUrl) finalUrl = publicData.publicUrl;
          }
        } catch (uploadErr) {
          console.error("Recording transfer (Daily → Supabase) error:", uploadErr);
        }

        // Save recording URL
        lesson.recordingStatus = "uploaded";
        lesson.recordingUrl = finalUrl;
        lesson.recordingActive = false;
        await lesson.save();

        // ============================================================
        // 🚀 NEW: TRIGGER AI ANALYSIS (Academic Secretary)
        // ============================================================
        try {
          const student = await User.findById(lesson.student);
          // Fetch student level (defaults to 'B1' if none set for safer AI output)
          const studentLevel = student?.proficiencyLevel || "B1"; 

          console.log(`🤖 Starting AI Summary for Lesson ${lessonId} at Level ${studentLevel}...`);
          
          // Trigger Gemini analysis with the video URL and student level
          const aiResults = await geminiService.analyzeLesson(finalUrl, studentLevel);
          
          if (aiResults) {
            lesson.aiSummary = {
              ...aiResults,
              generatedAt: new Date()
            };
            await lesson.save();
            console.log("✅ AI summary saved to database.");
          }
        } catch (aiErr) {
          console.error("❌ AI Analysis failed:", aiErr.message);
        }

        // Email tutor + student (Now includes notification about the AI notes)
        try {
          const tutor = await User.findById(lesson.tutor);
          const student = await User.findById(lesson.student);

          const subject = "Your Lernitt lesson summary and recording are ready";
          const text = `
Hello,

Your lesson recording and AI-generated linguistic summary are now ready.

Recording link: ${finalUrl}
View your summary in your Lernitt Dashboard under 'Lessons'.

Our AI Academic Secretary has extracted your key vocabulary, grammar corrections, 
and a thematic deep-dive tailored to your proficiency level.

– Lernitt
          `;

          if (tutor?.email) await sendEmail({ to: tutor.email, subject, text });
          if (student?.email) await sendEmail({ to: student.email, subject, text });
          console.log("📧 Success emails sent.");
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }

        return res.status(200).json({ ok: true });
      }

      // ... Rest of the existing recording error/no-participants logic ...
      if (event.type === "recording.error") {
        lesson.recordingStatus = "error";
        lesson.recordingActive = false;
        await lesson.save();
      }
      if (event.type === "recording.no-participants") {
        lesson.recordingStatus = "no-participants";
        lesson.recordingActive = false;
        await lesson.save();
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ ok: false });
    }
  }
);

// ... GET /api/video/webhook/create helper (kept exactly same) ...
router.get("/webhook/create", async (req, res) => {
  try {
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: "DAILY_API_KEY missing" });

    const webhookUrl = "https://lernitt.onrender.com/api/video/webhook";
    const response = await fetch("https://api.daily.co/v1/webhooks", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, eventTypes: ["recording.ready-to-download"] }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ ok: false, error: data });
    return res.json({ ok: true, hmac: data.hmac });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
