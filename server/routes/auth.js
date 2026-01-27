/**
 * LERNITT ACADEMY - CENTRAL AUTHENTICATION HUB v4.9.2
 * ----------------------------------------------------------------------------
 * This module orchestrates all identity-related operations for the platform:
 * - ACCOUNT CREATION: Multi-role registration with welcome automation.
 * - ACCESS CONTROL: Token generation and session validation.
 * - SECURITY RECOVERY: Cryptographically secure 'Forgot Password' flow.
 * - CREDENTIAL MANAGEMENT: Logged-in password updates with verification.
 * - LEGACY MIGRATION: Automatic conversion of plain-text passwords to bcrypt.
 * ----------------------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Standard Node.js crypto module for tokens
const User = require("../models/User");

/**
 * MIDDLEWARE INTEGRATION
 * ✅ Logic Preserved: Destructuring the auth function to ensure strict
 * compatibility with existing protected academy routes.
 */
const { auth } = require("../middleware/auth");

/**
 * COMMUNICATION UTILITIES
 * notify: Handles the dual-delivery of in-app alerts and SendGrid emails.
 * sendEmail: Direct delivery for high-priority security tokens.
 */
const { notify } = require("../utils/notify");
const { sendEmail } = require("../utils/sendEmail");

/**
 * HELPER: buildAuthResponse
 * ✅ Logic Preserved: Generates a 7-day JWT and returns a sanitized user profile
 * for immediate front-end session synchronization.
 * * @param {Object} user - The mongoose user document.
 * @returns {Object} { token, user: { profile data } }
 */
function buildAuthResponse(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Critical Failure: Missing JWT_SECRET in environment");
  }

  const payload = {
    id: user._id.toString(),
    role: user.role || "student",
  };

  // Signing the identity token with a standard 168-hour (7 day) duration
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
   ROUTE: SIGNUP (Student or Tutor)
   --------------------------------------------------------------------------
   ✅ PRESERVED: Role-selection, email validation, and welcome automation.
   ========================================================================== */
router.post("/signup", async (req, res) => {
  try {
    let { name, email, password, type } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Academic credentials (email/password) are required." });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "This email address is already registered." });
    }

    // Default name generation logic using email handle
    if (!name) {
      name = email.split("@")[0] || "User";
    }

    // Determine role based on registration entry point
    const signupType = String(type || "student").toLowerCase();
    const isTutorSignup = signupType === "tutor";
    const role = isTutorSignup ? "tutor" : "student";

    const user = new User({
      name,
      email,
      password, // Bcrypt hashing handled by User schema pre-save hook
      role,
      isTutor: isTutorSignup,
      tutorStatus: isTutorSignup ? "pending" : "none",
      isAdmin: false,
    });

    await user.save();

    /**
     * WELCOME AUTOMATION
     * ✅ Logic Preserved: Triggers immediate onboarding communications.
     */
    try {
      const welcomeTitle = isTutorSignup 
        ? "Welcome to Lernitt Academy (Tutor Edition)" 
        : "Welcome to Lernitt Academy";
        
      const welcomeMsg = isTutorSignup
        ? "Your application is currently being reviewed. Once approved, you can set your schedule."
        : "Welcome to the Lernitt community! You can now browse our marketplace and book your first lesson.";

      // Dual-channel delivery: Dashboard + Email
      await notify(
        user._id, 
        'welcome', 
        welcomeTitle, 
        welcomeMsg
      );
      
      console.log(`[AUTH] Academic welcome dispatched for: ${user.email}`);
    } catch (notifyErr) {
      // Notification failures should not disrupt account creation
      console.error("[AUTH] Post-signup notification failure:", notifyErr);
    }

    const authPayload = buildAuthResponse(user);
    return res.status(201).json(authPayload);

  } catch (err) {
    console.error("Signup internal error:", err);
    return res
      .status(500)
      .json({ error: "Signup failed: " + (err.message || "Unknown error") });
  }
});

/* ==========================================================================
   ROUTE: LOGIN
   --------------------------------------------------------------------------
   ✅ PRESERVED: Legacy plain-text password migration logic.
   ========================================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Identification and access code required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "❌ Academic profile not found." });
    }

    let ok = false;
    const stored = user.password || "";
    const isHash = typeof stored === "string" && stored.startsWith("$2");

    if (isHash) {
      // Standard operation: Secure bcrypt comparison
      ok = await user.comparePassword(password);
    } else {
      /**
       * LEGACY MIGRATION LOGIC
       * ✅ Logic Preserved: Handles historical plain-text accounts securely.
       */
      ok = stored === password;
      if (ok) {
        // Transparently migrate the account to the current bcrypt standard
        user.password = password; 
        try {
          await user.save();
          console.log(`[AUTH] Legacy credentials migrated for: ${email}`);
        } catch (mErr) {
          console.error("Error during plain-text to hash migration:", mErr);
        }
      }
    }

    if (!ok) {
      return res.status(400).json({ error: "❌ Invalid academic credentials." });
    }

    const authPayload = buildAuthResponse(user);

    // Metadata tracking: Analytics and security auditing
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false }).catch(() => {});

    return res.json(authPayload);

  } catch (err) {
    console.error("Login internal error:", err);
    return res
      .status(500)
      .json({ error: "Login failed: " + (err.message || "Unknown error") });
  }
});

/* ==========================================================================
   ✅ NEW ROUTE: UPDATE PASSWORD (SETTINGS)
   --------------------------------------------------------------------------
   Strictly verified credential update for logged-in students and tutors.
   ========================================================================== */
router.patch("/update-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Field presence validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: "Both current and new access codes are required for this security operation." 
      });
    }

    // Retrieve full document for comparison logic
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Academic profile not identified." });
    }

    /**
     * IDENTITY VERIFICATION
     * We must confirm the user knows their existing password before
     * allowing a change, preventing hijacking if a session is left open.
     */
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        error: "The current access code provided is incorrect." 
      });
    }

    /**
     * CREDENTIAL OVERRIDE
     * User schema pre-save hook will automatically hash this new value.
     */
    user.password = newPassword;
    await user.save();

    /**
     * SECURITY AUDIT LOGGING
     * Notifying the user of the critical credential change.
     */
    try {
      await notify(
        user._id, 
        'security', 
        'Access Credentials Updated', 
        'Your academic password was successfully modified via your dashboard settings.'
      );
    } catch (nErr) {
      console.warn("[AUTH] Security update notification suspended.");
    }

    return res.json({ 
      ok: true, 
      message: "Academy password updated successfully. Your new credentials are now active." 
    });

  } catch (err) {
    console.error("[AUTH] Internal error during patch-update:", err);
    return res.status(500).json({ 
      error: "Critical failure during academic credential update." 
    });
  }
});

/* ==========================================================================
   ROUTE: FORGOT PASSWORD REQUEST
   --------------------------------------------------------------------------
   ✅ PRESERVED: Secure token generation and SendGrid automation.
   ========================================================================== */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    /**
     * SECURITY OBSCURATION
     * ✅ Logic Preserved: Avoid revealing account existence to third parties.
     */
    if (!user) {
      return res.json({ 
        message: "If an account exists with that email, a reset link has been sent." 
      });
    }

    // Generate cryptographically secure token (Node.js standard)
    const token = crypto.randomBytes(20).toString("hex");
    
    // Assign token and set strict 1-hour expiration
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save();

    // Construct identity-sensitive reset URL for the frontend instance
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Deliver via SendGrid infrastructure
    await sendEmail({
      to: user.email,
      subject: "Lernitt Academy: Password Reset Request",
      html: `
        <div style="font-family: sans-serif; padding: 25px; border: 1px solid #f1f5f9; border-radius: 20px; max-width: 500px; margin: auto;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Secure Reset Request</h2>
          <p style="color: #334155;">Hello ${user.name},</p>
          <p style="color: #334155;">A password reset was requested for your Lernitt account. This link is active for <strong>1 hour</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: #4f46e5; color: white; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px;">RESET PASSWORD</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">If you did not request this change, your profile remains safe. No action is required.</p>
        </div>
      `
    });

    return res.json({ 
      message: "If an account exists with that email, a reset link has been sent." 
    });

  } catch (err) {
    console.error("[AUTH] Recovery request failure:", err);
    return res.status(500).json({ error: "Academy recovery logic encountered an error." });
  }
});

/* ==========================================================================
   ROUTE: RESET PASSWORD FINALIZATION
   --------------------------------------------------------------------------
   ✅ PRESERVED: Token validation and password override logic.
   ========================================================================== */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate token existence and expiration window
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: "Academic reset token is invalid or has expired." 
      });
    }

    /**
     * FINALIZING RECOVERY
     * Note: The User model pre-save hook will automatically hash the new password.
     */
    user.password = newPassword;
    
    // Flush temporary security fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    return res.json({ 
      message: "Success! Your credentials have been updated. You can now access your dashboard." 
    });

  } catch (err) {
    console.error("[AUTH] Recovery finalization failure:", err);
    return res.status(500).json({ error: "Failed to finalize academic recovery." });
  }
});

/* ==========================================================================
   ROUTE: CONNECTION CHECK
   --------------------------------------------------------------------------
   ✅ PRESERVED: Standard protected connectivity test for active sessions.
   ========================================================================== */
router.get("/check", auth, (req, res) => {
  res.json({ 
    message: "🔒 Protected academy session active", 
    userId: req.user.id 
  });
});

module.exports = router;
