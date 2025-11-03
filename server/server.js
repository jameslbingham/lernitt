// /server/server.js  (CommonJS)
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const payoutRoutes = require("./routes/payouts");
const refundRoutes = require("./routes/refunds");
const seedRoutes = require("./routes/seed");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Mongo only if URI present
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((e) => console.error("❌ Mongo error:", e.message));
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/seed", seedRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
