// /server/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const { auth, isAdmin } = require("./middleware/auth");
const videoWebhookRouter = require("./routes/videoWebhook");

const app = express();

/* --- THE TOTAL ACCESS FIX: Removing connection barriers --- */
app.use(require('cors')({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api/video", videoWebhookRouter);
app.use(express.json());

// Database Connection
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch((e) => console.error("❌ Database Error:", e.message));
}

/* --- API ROUTES --- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tutors", require("./routes/tutors"));
app.use("/api/reviews", require("./routes/reviews"));

// Authenticated Routes
app.use("/api/lessons", auth, require("./routes/lessons"));
app.use("/api/tutor-lessons", auth, require("./routes/tutorLessons"));
app.use("/api/students", auth, require("./routes/students"));
app.use("/api/availability", auth, require("./routes/availability"));
app.use("/api/video", auth, require("./routes/video"));
app.use("/api/notifications", auth, require("./routes/notifications"));
app.use("/api/payments", auth, require("./routes/payments"));
app.use("/api/profile", auth, require("./routes/profile"));
app.use("/api/support", auth, require("./routes/support"));
app.use("/api/assessment", auth, require("./routes/assessment"));

// Admin Routes (Bob Only)
app.use("/api/admin", auth, isAdmin, require("./routes/admin"));
app.use("/api/admin/payments", auth, isAdmin, require("./routes/adminPayments"));
app.use("/api/payouts", auth, isAdmin, require("./routes/payouts"));
app.use("/api/refunds", auth, isAdmin, require("./routes/refunds"));
app.use("/api/finance", auth, isAdmin, require("./routes/finance"));
app.use("/api/metrics", auth, isAdmin, require("./routes/metrics"));

app.use("/api/stripe/webhook", require("./routes/stripeWebhook"));
app.use("/api/paypal/webhook", require("./routes/paypalWebhook"));
app.use("/api/seed", require("./routes/seed"));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* --- FRONTEND DELIVERY --- */
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
  if (!req.url.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  }
});

/* --- ADMIN BOOTSTRAP --- */
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
      user.role = "admin";
      user.isAdmin = true;
    }
    await user.save();
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
