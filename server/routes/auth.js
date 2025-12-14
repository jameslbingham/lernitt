// /server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// helper to build token + public user
function buildAuthResponse(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment");
  }

  const payload = {
    id: user._id.toString(),
    role: user.role || "student",
  };

  const token = jwt.sign(payload, secret, { expiresIn: "7d" });

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "student",
      isTutor: !!user.isTutor,
      isAdmin: !!user.isAdmin,
    },
  };
}

// -----------------------------
// Signup
// -----------------------------
router.post("/signup", async (req, res) => {
  try {
    let { name, email, password, type } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already used" });
    }

    // fallback name
    if (!name) {
      name = email.split("@")[0] || "User";
    }

    // 🔒 AUTHORITATIVE ROLE DECISION
    const signupType = String(type || "student").toLowerCase();
    const role = signupType === "tutor" ? "tutor" : "student";

    const user = new User({
      name,
      email,
      password, // hashed by schema
      role,
      isTutor: role === "tutor",
      isAdmin: false,
    });

    await user.save();

    const authPayload = buildAuthResponse(user);
    return res.status(201).json(authPayload);
  } catch (err) {
    console.error("Signup error:", err);
    return res
      .status(500)
      .json({ error: "Signup failed: " + (err.message || "Unknown error") });
  }
});

// -----------------------------
// Login
// -----------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "❌ User not found" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(400).json({ error: "❌ Wrong password" });
    }

    const authPayload = buildAuthResponse(user);

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false }).catch(() => {});

    return res.json(authPayload);
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ error: "Login failed: " + (err.message || "Unknown error") });
  }
});

// -----------------------------
// Protected test route
// -----------------------------
router.get("/check", auth, (req, res) => {
  res.json({ message: "🔒 Protected route", userId: req.user.id });
});

module.exports = router;
