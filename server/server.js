// /server/server.js
import express from "express";
import cors from "cors";

const app = express();

// --- CORS (safe origins) ---
const ALLOW = ["http://localhost:5173", "https://lernitt.vercel.app"];
app.use(cors({ origin: ALLOW, credentials: true }));

// --- Health check route ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
