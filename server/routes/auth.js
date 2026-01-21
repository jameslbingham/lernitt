// /server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Fix: Destructure the auth function from the middleware object
const { auth } = require("../middleware/auth");

// Helper to build token + public user
function buildAuthResponse(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment");
  }

  const payload = {
    id: user._id.toString(),
    role: user.role || "student",
  };

  // 7-day JWT
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
      tutorStatus: user.tutorStatus || "none",
    },
  };
}

// -----------------------------
// Signup  (student or tutor)
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

    // Fallback name
    if (!name) {
      name = email.split("@")[0] || "User";
    }

    // Decide if this signup is for a tutor
    const signupType = String(type || "student").toLowerCase();
    const isTutorSignup = signupType === "tutor";
    const role = isTutorSignup ? "tutor" : "student";

    const user = new User({
      name,
      email,
      password, // hashed by schema
      role,
      isTutor: isTutorSignup,
      tutorStatus: isTutorSignup ? "pending" : "none",
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
// Login  (supports legacy plain-text passwords)
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

    let ok = false;
    const stored = user.password || "";
    const isHash =
      typeof stored === "string" && stored.startsWith("$2");

    if (isHash) {
      // Normal path: bcrypt hash compare
      ok = await user.comparePassword(password);
    } else {
      // Legacy account: password was stored in plain text
      ok = stored === password;
      if (ok) {
        // Migrate: re-save with hashing
        user.password = password; // pre-save hook will hash
        try {
          await user.save();
        } catch (mErr) {
          console.error(
            "Error migrating plain-text password to hash:",
            mErr
          );
        }
      }
    }

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
