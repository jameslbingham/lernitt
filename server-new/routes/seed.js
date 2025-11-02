// /server/routes/seed.js (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const router = express.Router();

// Run the finance seed script as a function
async function runSeed() {
  // Load env from /server/.env explicitly
  require("dotenv").config({
    path: path.resolve(__dirname, "..", ".env"),
    override: true,
  });

  // Dynamically import the script's main function by executing it here
  // We refactor financeSeed.js to export a function if possible
  const seed = require("../seed/financeSeed");
  if (typeof seed.seedFinance === "function") {
    return await seed.seedFinance();
  } else if (typeof seed === "function") {
    return await seed();
  } else {
    // fallback: execute the file by requiring it (if it self-runs)
    return { note: "financeSeed.js executed (self-running script)" };
  }
}

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

module.exports = router;
