// /server/routes/seed.js
import { Router } from "express";
import mongoose from "mongoose";
import { runSeed } from "../seed/seed.js";

const router = Router();

router.post("/", async (req, res) => {
  const token = req.header("x-seed-token") || req.query.token;
  if (!token || token !== process.env.SEED_TOKEN)
    return res.status(401).json({ error: "unauthorized" });

  try {
    if (mongoose.connection.readyState !== 1)
      await mongoose.connect(process.env.MONGODB_URI);

    const result = await runSeed();
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
