const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Get my private profile
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("name email createdAt");
  res.json(user);
});

// Update my private profile
router.put("/me", auth, async (req, res) => {
  const { bio, subjects, price, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { bio, subjects, price, avatar },
    { new: true, runValidators: true }
  ).select("name email bio subjects price avatar");
  res.json(user);
});

/* ======================================================
   Tutor profile endpoints used by TutorProfileSetup.jsx
   ====================================================== */

// GET /api/profile/tutor
router.get("/tutor", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name headline bio languages subjects hourlyRate price"
    );

    if (!user) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    res.json({
      displayName: user.name || "",
      headline: user.headline || "",
      bio: user.bio || "",
      languages: user.languages || user.subjects || "",
      hourlyRate:
        user.hourlyRate != null
          ? user.hourlyRate
          : user.price != null
          ? user.price
          : null,
    });
  } catch (e) {
    console.error("[PROFILE][GET /tutor] error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/profile/tutor
router.put("/tutor", auth, async (req, res) => {
  try {
    const { displayName, headline, bio, languages, hourlyRate } = req.body || {};

    const update = {};

    if (displayName != null) update.name = displayName;
    if (headline != null) update.headline = headline;
    if (bio != null) update.bio = bio;
    if (languages != null) {
      update.languages = languages;
      update.subjects = languages;
    }
    if (typeof hourlyRate === "number") {
      update.hourlyRate = hourlyRate;
      update.price = hourlyRate;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("name headline bio languages subjects hourlyRate price");

    if (!user) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    res.json({
      displayName: user.name || "",
      headline: user.headline || "",
      bio: user.bio || "",
      languages: user.languages || user.subjects || "",
      hourlyRate:
        user.hourlyRate != null
          ? user.hourlyRate
          : user.price != null
          ? user.price
          : null,
    });
  } catch (e) {
    console.error("[PROFILE][PUT /tutor] error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
