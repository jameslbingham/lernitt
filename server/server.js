// /server/server.js  (CommonJS)
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Import our new security guards
const { auth, isAdmin } = require("./middleware/auth");
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

/* ------------------------------ Open Routes ------------------------------ */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tutors", require("./routes/tutors"));
app.use("/api/reviews", require("./routes/reviews"));

/* -------------------------- Authenticated Routes ------------------------- */
// These require a valid login (Tutors and Students)
app.use("/api/lessons", auth, require("./routes/lessons"));
app.use("/api/tutor-lessons", auth, require("./routes/tutorLessons"));
app.use("/api/students", auth, require("./routes/students"));
app.use("/api/availability", auth, require("./routes/availability"));
app.use("/api/video", auth, require("./routes/video"));
app.use("/api/notifications", auth, require("./routes/notifications"));
app.use("/api/payments", auth, require("./routes/payments"));
app.use("/api/profile", auth, require("./routes/profile"));

/* ---------------------------- Admin Only Routes -------------------------- */
// These strictly require Admin Bob privileges
app.use("/api/admin", auth, isAdmin, require("./routes/admin"));
app.use("/api/admin/payments", auth, isAdmin, require("./routes/adminPayments"));
app.use("/api/payouts", auth, isAdmin, require("./routes/payouts"));
app.use("/api/refunds", auth, isAdmin, require("./routes/refunds"));
app.use("/api/finance", auth, isAdmin, require("./routes/finance"));
app.use("/api/metrics", auth, isAdmin, require("./routes/metrics"));

/* ------------------------------- Webhooks -------------------------------- */
app.use("/api/stripe/webhook", require("./routes/stripeWebhook"));
app.use("/api/paypal/webhook", require("./routes/paypalWebhook"));

/* ------------------------------- Utilities ------------------------------- */
app.use("/api/seed", require("./routes/seed"));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.json({ ok: true, message: "Lernitt backend running" }));

// ONE-TIME ADMIN BOOTSTRAP (protected by SEED_TOKEN)
app.get("/api/admin-bootstrap", async (req, res) => {
  try {
    if (!process.env.SEED_TOKEN || req.query.token !== process.env.SEED_TOKEN) {
      return res.status(401).json({ error: "Bad token" });
    }
    const User = require("./models/User");
    const email = "jameslbingham@yahoo.com";
    const password = "AusLERlerAus&$682705$";

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name: "Admin", email, password, role: "admin", isAdmin: true });
    } else {
      user.name = user.name || "Admin";
      user.password = password; 
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
