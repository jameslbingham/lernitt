// /server/routes/seed.js (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Run the finance seed script as a function
async function runSeed() {
  require("dotenv").config({
    path: path.resolve(__dirname, "..", ".env"),
    override: true,
  });

  const seed = require("../seed/financeSeed");
  if (typeof seed.seedFinance === "function") {
    return await seed.seedFinance();
  } else if (typeof seed === "function") {
    return await seed();
  } else {
    return { note: "financeSeed.js executed (self-running script)" };
  }
}

// Finance seed endpoint
router.post("/", async (req, res) => {
  const token = req.header("x-seed-token") || req.query.token;
  if (!token || token !== process.env.SEED_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    const result = await runSeed();
    res.json({ ok: true, ...(result || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Set demo admin credentials
router.post("/set-demo-admin", async (req, res) => {
  try {
    const token = req.header("x-seed-token") || req.query.token;
    if (!token || token !== process.env.SEED_TOKEN) {
      return res.status(401).send("Unauthorized");
    }
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

module.exports = router;
