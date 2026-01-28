// /server/server.js  (CommonJS)
// ============================================================================
// LERNITT — PRODUCTION SERVER CORE v5.5.0
// ----------------------------------------------------------------------------
// Includes: Secure API Mapping, Admin Bootstrapping, and Corrected Static UI Delivery.
// ============================================================================

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path"); // ✅ REQUIRED: Correctly resolves project paths for Render
require("dotenv").config();

// Import security logic (PRESERVED)
const { auth, isAdmin } = require("./middleware/auth");
const videoWebhookRouter = require("./routes/videoWebhook");

const app = express();

/* ============================================================================
   TASK 5: PRODUCTION CORS CONFIGURATION (PRESERVED)
   ============================================================================ */
const allowedOrigins = [
  'http://localhost:5173',            // Local Development
  'https://lernitt.onrender.com',     // Production Render Domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Webhook for high-priority video processing (PRESERVED)
app.use("/api/video", videoWebhookRouter);

// Standard payload parsing (PRESERVED)
app.use(express.json());

// Establish MongoDB Connection (PRESERVED)
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((e) => console.error("❌ Mongo error:", e.message));
}

/* ----------------------------------------------------------------------------
   TASK 4: SECURITY ROUTE MAPPING (PRESERVED)
   ---------------------------------------------------------------------------- */

/* --- Open Academic Routes --- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tutors", require("./routes/tutors"));
app.use("/api/reviews", require("./routes/reviews"));

/* --- Authenticated Academic Routes --- */
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

/* --- Administrative Oversight (Strictly Bob Only) --- */
app.use("/api/admin", auth, isAdmin, require("./routes/admin"));
app.use("/api/admin/payments", auth, isAdmin, require("./routes/adminPayments"));
app.use("/api/payouts", auth, isAdmin, require("./routes/payouts"));
app.use("/api/refunds", auth, isAdmin, require("./routes/refunds"));
app.use("/api/finance", auth, isAdmin, require("./routes/finance"));
app.use("/api/metrics", auth, isAdmin, require("./routes/metrics"));

/* --- Financial & Academic Webhooks --- */
app.use("/api/stripe/webhook", require("./routes/stripeWebhook"));
app.use("/api/paypal/webhook", require("./routes/paypalWebhook"));

/* --- System Utilities --- */
app.use("/api/seed", require("./routes/seed"));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ============================================================================
   ✅ CORRECTED: PRODUCTION FRONTEND BRIDGE
   ----------------------------------------------------------------------------
   Standard sibling pathing: Exit 'server', enter 'client/dist'.
   ============================================================================ */

// 1. Serve static assets (CSS, JS, Images) from the Vite 'dist' folder
app.use(express.static(path.join(__dirname, "../client/dist")));

// 2. Catch-all for non-API routes: Serves the visual homepage index.html
app.get("*", (req, res) => {
  // We only serve index.html if the URL does NOT start with /api/
  if (!req.url.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  }
});

/* ----------------------------------------------------------------------------
   ADMIN BOOTSTRAP (PRESERVED)
   ---------------------------------------------------------------------------- */
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
