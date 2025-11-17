// server/routes/videoWebhook.js
const express = require("express");
const crypto = require("crypto");
const router = express.Router();

router.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const signature = req.headers["daily-signature"];
    const secret = process.env.DAILY_WEBHOOK_SECRET;

    if (!signature || !secret) return res.status(400).end();

    // Verify signature (Daily docs)
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    if (signature !== hmac) return res.status(401).end();

    const event = JSON.parse(req.body.toString());

    console.log("Daily webhook:", event.type);

    // TODO: handle recording events:
    // recording.started
    // recording.finished
    // recording.error
    // recording.no-participants

    return res.status(200).end();
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

module.exports = router;
