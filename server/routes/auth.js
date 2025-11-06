// /server/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth"); // ✅ middleware

// -----------------------------
// Signup (hash password)
// -----------------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).send("Email already used");

    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hash,
      role: "student",
    });

    res.status(201).json({
      message: "✅ User created",
      user: { id: newUser._id, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Error: " + err.message);
  }
});

// -----------------------------
// Login (compare hash + give token)
// -----------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "❌ User not found" });

    // Compare password hash
    const hasPassword = !!user.password;
    const ok = hasPassword ? await bcrypt.compare(password, user.password) : false;

    if (!ok) return res.status(400).json({ error: "❌ Wrong password" });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("Missing JWT_SECRET in environment");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role || "student" },
      secret,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role || "student",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error: " + err.message });
  }
});

// -----------------------------
// Protected test route
// -----------------------------
router.get("/check", auth, (req, res) => {
  res.json({ message: "🔒 Protected route", userId: req.user.id });
});

module.exports = router;
