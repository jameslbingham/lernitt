// /server/server.js  (CommonJS)
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const videoWebhookRouter = require("./routes/videoWebhook");

const app = express();

// Updated CORS line
app.use(cors({ origin: "*", credentials: true }));

// Daily webhook MUST come before express.json() so raw body is preserved
app.use("/api/video", videoWebhookRouter);

// Normal JSON parser for all other routes
app.use(express.json());

// Connect to Mongo only if URI present
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((e) => console.error("❌ Mongo error:", e.message));
}

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tutors", require("./routes/tutors"));
app.use("/api/lessons", require("./routes/lessons"));
app.use("/api/tutor-lessons", require("./routes/tutorLessons"));
app.use("/api/students", require("./routes/students"));
app.use("/api/availability", require("./routes/availability"));
app.use("/api/video", require("./routes/video"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/payouts", require("./routes/payouts"));
app.use("/api/refunds", require("./routes/refunds"));
app.use("/api/finance", require("./routes/finance"));
app.use("/api/metrics", require("./routes/metrics"));
app.use("/api/admin", require("./routes/admin"));

// Amending Admin Payments route to match frontend api.js expectations
app.use("/api/admin/payments", require("./routes/adminPayments"));

app.use("/api/profile", require("./routes/profile"));
app.use("/api/support", require("./routes/support"));

// webhooks (no auth)
app.use("/api/stripe/webhook", require("./routes/stripeWebhook"));
app.use("/api/paypal/webhook", require("./routes/paypalWebhook"));

// seed utilities (dev only)
app.use("/api/seed", require("./routes/seed"));

// Health check (moved under /api)
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Root check (optional, helps debugging)
app.get("/", (_req, res) =>
  res.json({ ok: true, message: "Lernitt backend running" })
);

// ONE-TIME ADMIN BOOTSTRAP (protected by SEED_TOKEN)
app.get("/api/admin-bootstrap", async (req, res) => {
  try {
    if (!process.env.SEED_TOKEN || req.query.token !== process.env.SEED_TOKEN) {
      return res.status(401).json({ error: "Bad token" });
    }

    const User = require("./models/User");

    // Put YOUR email here:
    const email = "jameslbingham@yahoo.com";

    // Choose a NEW password here (do NOT reuse one you posted):
    const password = "AusLERlerAus&$682705$";

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name: "Admin", email, password, role: "admin", isAdmin: true });
    } else {
      user.name = user.name || "Admin";
      user.password = password; // will re-hash via User model pre-save
      user.role = "admin";
      user.isAdmin = true;
    }

    await user.save();
    return res.json({ ok: true, email, password });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
