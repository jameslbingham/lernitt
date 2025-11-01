// /server/server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import seedRouter from "./routes/seed.js";
import payoutsRouter from "./routes/payouts.js";
import refundsRouter from "./routes/refunds.js";

const app = express();
app.use(express.json()); // parse JSON bodies

// CORS
const ALLOW = ["http://localhost:5173", "https://lernitt.vercel.app"];
app.use(cors({ origin: ALLOW, credentials: true }));

// MongoDB connect
const uri = process.env.MONGODB_URI;
console.log("MONGODB_URI present:", !!uri);
if (uri) {
  mongoose
    .connect(uri)
    .then(() => console.log("✅ Mongo connected"))
    .catch((err) => console.error("❌ Mongo connect error:", err.message));
} else {
  console.warn("⚠️ No MONGODB_URI set");
}

// Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState, // 1 = connected
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/seed", seedRouter);
app.use("/api/payouts", payoutsRouter);
app.use("/api/refunds", refundsRouter);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
