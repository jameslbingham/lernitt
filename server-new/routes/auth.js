const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth"); // ✅ middleware

// Signup (hash password)
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).send("Email already used");
    const hash = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hash });
    res.status(201).send("✅ User created");
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// Login (compare hash + give token)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("❌ User not found");
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).send("❌ Wrong password");

    // create token using secret from .env
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// Protected test route
router.get("/check", auth, (req, res) => {
  res.send("🔒 Protected route, user id: " + req.user.id);
});

module.exports = router;
