// /server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // ✅ NEW: Built-in Node tool for secure token generation
const User = require("../models/User");

/**
 * MIDDLEWARE IMPORT
 * Note: Destructuring the auth function from the middleware object
 * to ensure compatibility with existing protected routes.
 */
const { auth } = require("../middleware/auth");

/**
 * NOTIFICATION UTILITY
 * ✅ FUNCTIONALITY PRESERVED: Required for the Welcome Email logic
 * which triggers both MongoDB notifications and SendGrid emails.
 */
const { notify } = require("../utils/notify");

/**
 * EMAIL UTILITY
 * ✅ NEW FUNCTIONALITY: Required for direct delivery of reset tokens
 */
const { sendEmail } = require("../utils/sendEmail");

/**
 * HELPER: buildAuthResponse
 * Generates a 7-day JWT and returns a sterilized user profile
 * for front-end session management.
 */
function buildAuthResponse(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment");
  }

  const payload = {
    id: user._id.toString(),
    role: user.role || "student",
  };

  // 7-day JWT token generation
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

/* ==========================================================================
   Signup Route (Student or Tutor)
   ✅ PRESERVED: All original role-selection and welcome logic
   ========================================================================== */
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

    // Fallback name logic: use email prefix if name is missing
    if (!name) {
      name = email.split("@")[0] || "User";
    }

    // Decide if this signup is for a tutor or student role
    const signupType = String(type || "student").toLowerCase();
    const isTutorSignup = signupType === "tutor";
    const role = isTutorSignup ? "tutor" : "student";

    const user = new User({
      name,
      email,
      password, // Note: hashed by the User schema pre-save hook
      role,
      isTutor: isTutorSignup,
      tutorStatus: isTutorSignup ? "pending" : "none",
      isAdmin: false,
    });

    await user.save();

    // ✅ FUNCTIONALITY PRESERVED: Trigger Welcome Notification & Email alert
    try {
      const welcomeTitle = isTutorSignup 
        ? "Welcome to Lernitt Academy (Tutor Edition)" 
        : "Welcome to Lernitt Academy";
        
      const welcomeMsg = isTutorSignup
        ? "Your application is currently being reviewed. Once approved, you will be able to set your schedule and start accepting students."
        : "Welcome to the Lernitt community! You can now browse our elite marketplace and book your first lesson.";

      // Triggers both MongoDB notification and SendGrid email
      await notify(
        user._id, 
        'welcome', 
        welcomeTitle, 
        welcomeMsg
      );
      
      console.log(`[AUTH] Welcome alert dispatched for: ${user.email}`);
    } catch (notifyErr) {
      // Log notification failure but do not break the signup process
      console.error("[AUTH] Welcome notification failed:", notifyErr);
    }

    const authPayload = buildAuthResponse(user);
    return res.status(201).json(authPayload);

  } catch (err) {
    console.error("Signup error:", err);
    return res
      .status(500)
      .json({ error: "Signup failed: " + (err.message || "Unknown error") });
  }
});

/* ==========================================================================
   Login Route
   ✅ PRESERVED: Original logic for legacy plain-text password migration
   ========================================================================== */
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
    // Detect if password is a bcrypt hash (starts with $2)
    const isHash = typeof stored === "string" && stored.startsWith("$2");

    if (isHash) {
      // Normal path: bcrypt hash comparison
      ok = await user.comparePassword(password);
    } else {
      // ✅ PRESERVED: Legacy account migration logic
      // Password was stored in plain text; check for exact match
      ok = stored === password;
      if (ok) {
        // Automatically migrate to hash upon successful match
        user.password = password; // pre-save hook will hash this
        try {
          await user.save();
          console.log(`[AUTH] Migrated legacy password for user: ${email}`);
        } catch (mErr) {
          console.error("Error migrating plain-text password to hash:", mErr);
        }
      }
    }

    if (!ok) {
      return res.status(400).json({ error: "❌ Invalid credentials" });
    }

    const authPayload = buildAuthResponse(user);

    // Track last login timestamp
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

/* ==========================================================================
   ✅ NEW: Forgot Password Request
   Generates a secure token and sends a recovery email via SendGrid.
   ========================================================================== */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    /**
     * For security, do not explicitly reveal if a user exists.
     * We return the same generic message regardless.
     */
    if (!user) {
      return res.json({ 
        message: "If an account exists with that email, a reset link has been sent." 
      });
    }

    // Generate a secure temporary token (20 bytes converted to hex)
    const token = crypto.randomBytes(20).toString("hex");
    
    // Set token and 1-hour expiration timestamp on the user record
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 60 minutes
    await user.save();

    // Construct the reset URL for the React frontend
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Deliver the email using existing SendGrid utility
    await sendEmail({
      to: user.email,
      subject: "Lernitt Academy: Password Reset Request",
      html: `
        <div style="font-family: sans-serif; padding: 25px; border: 1px solid #f1f5f9; border-radius: 20px; max-width: 500px; margin: auto;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Secure Reset Request</h2>
          <p style="color: #334155; line-height: 1.5;">Hello ${user.name},</p>
          <p style="color: #334155; line-height: 1.5;">A password reset was requested for your account. Click the button below to secure your profile. This link is active for <strong>1 hour</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: #4f46e5; color: white; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px;">RESET PASSWORD</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">
            If you did not request this change, please disregard this message. Your current password will remain safe.
          </p>
        </div>
      `
    });

    return res.json({ 
      message: "If an account exists with that email, a reset link has been sent." 
    });

  } catch (err) {
    console.error("[AUTH] Forgot password internal error:", err);
    return res.status(500).json({ error: "Server error during password recovery" });
  }
});

/* ==========================================================================
   ✅ NEW: Reset Password Finalization
   Verifies the token validity and overrides the user password.
   ========================================================================== */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Search for a user with a matching token that has not expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: "Password reset token is invalid or has expired." 
      });
    }

    /**
     * Set the new password.
     * Note: The User model pre-save hook will automatically hash this.
     */
    user.password = newPassword;
    
    // Clear temporary recovery fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    return res.json({ 
      message: "Success! Your password has been updated. You can now log in." 
    });

  } catch (err) {
    console.error("[AUTH] Password override failure:", err);
    return res.status(500).json({ error: "Server error during password update" });
  }
});

/* ==========================================================================
   Connection Check
   ✅ PRESERVED: Original protected connectivity test route
   ========================================================================== */
router.get("/check", auth, (req, res) => {
  res.json({ 
    message: "🔒 Protected session active", 
    userId: req.user.id 
  });
});

module.exports = router;
