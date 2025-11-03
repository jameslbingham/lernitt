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

module.exports = router;
