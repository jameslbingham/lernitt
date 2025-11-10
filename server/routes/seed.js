// /server/routes/seed.js (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Utility: connect to DB if not connected
async function ensureMongo() {
  if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

// Run the finance seed script as a function
async function runFinanceSeed() {
  require("dotenv").config({
    path: path.resolve(__dirname, "..", ".env"),
    override: true,
  });
  const seed = require("../seed/financeSeed");
  if (typeof seed.seedFinance === "function") return await seed.seedFinance();
  if (typeof seed === "function") return await seed();
  return { note: "financeSeed.js executed (self-running script)" };
}

// Finance seed endpoint (protected by token)
router.post("/", async (req, res) => {
  const token = req.header("x-seed-token") || req.query.token;
  if (!token || token !== process.env.SEED_TOKEN)
    return res.status(401).json({ error: "unauthorized" });

  try {
    await ensureMongo();
    const result = await runFinanceSeed();
    res.json({ ok: true, ...(result || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Set demo admin credentials
router.post("/set-demo-admin", async (req, res) => {
  const token = req.header("x-seed-token") || req.query.token;
  if (!token || token !== process.env.SEED_TOKEN)
    return res.status(401).send("Unauthorized");

  try {
    await ensureMongo();
    const email = "admin@example.com";
    const hash = await bcrypt.hash("123456", 10);
    const upd = await User.findOneAndUpdate(
      { email },
      { $set: { email, name: "Admin", role: "admin", password: hash } },
      { upsert: true, new: true }
    );
    res.json({ ok: true, id: upd._id.toString() });
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
});

// NEW: full seed route for admin + student users
router.post("/admin-seed", async (req, res) => {
  const token = req.header("x-seed-token") || req.query.token;
  if (!token || token !== process.env.SEED_TOKEN)
    return res.status(401).json({ error: "unauthorized" });

  try {
    await ensureMongo();

    const adminHash = await bcrypt.hash("123456", 10);
    const studentHash = await bcrypt.hash("123456", 10);

    const admin = await User.findOneAndUpdate(
      { email: "admin@example.com" },
      {
        $set: {
          name: "Admin",
          role: "admin",
          password: adminHash,
        },
      },
      { upsert: true, new: true }
    );

    const student = await User.findOneAndUpdate(
      { email: "alice@example.com" },
      {
        $set: {
          name: "Alice",
          role: "student",
          password: studentHash,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      ok: true,
      message: "Admin and student seeded successfully",
      adminId: admin._id,
      studentId: student._id,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
