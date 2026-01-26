// /server/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

/**
 * LERNITT ACADEMY - ENHANCED USER DATA MODEL v3.2.0
 * ----------------------------------------------------------------------------
 * CORE ARCHITECTURE:
 * - Identity: Fundamental account credentials and unique identification.
 * - Pedagogy: AI-driven "Level Aware" assessment data and Linguistic DNA.
 * - Commerce: italki-style multi-tiered pricing, packages, and payout metadata.
 * - Security: Bcrypt-hashed credentials and temporary reset tokens.
 * ----------------------------------------------------------------------------
 */

const UserSchema = new Schema(
  {
    /**
     * ACCOUNT IDENTITY
     * Basic required fields for user authentication and platform presence.
     */
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { 
      type: String, 
      required: true 
    },

    /**
     * RECOVERY & SECURITY (✅ NEW FIELDS ADDED)
     * Temporary tokens used for the secure 'Forgot Password' recovery flow.
     */
    resetPasswordToken: { 
      type: String 
    },
    resetPasswordExpires: { 
      type: Date 
    },

    /**
     * TUTOR PROFESSIONAL METADATA
     * Fields specific to instructors, including bio, subjects, and pricing.
     */
    bio: { 
      type: String 
    },
    subjects: [{ 
      type: String 
    }],
    price: { 
      type: Number 
    }, 
    avatar: { 
      type: String 
    },

    /**
     * FINANCIAL & PAYOUT INTEGRATION
     * Connects the account to Stripe or PayPal for revenue distribution.
     */
    stripeAccountId: { 
      type: String 
    },
    payoutsEnabled: { 
      type: Boolean, 
      default: false 
    },
    paypalEmail: { 
      type: String 
    },

    /**
     * ACCESS CONTROL & PERMISSIONS
     * Determines user capabilities within the platform ecosystem.
     */
    isAdmin: { 
      type: Boolean, 
      default: false 
    },
    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student",
      index: true,
    },
    isTutor: { 
      type: Boolean, 
      default: false 
    },

    /**
     * TUTOR APPROVAL WORKFLOW
     * Manages the status of new tutor applications.
     */
    tutorStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
      index: true,
    },

    /**
     * AI-DRIVEN LEVEL ASSESSMENT (CEFR)
     * Tracks student proficiency for "Level Aware" curriculum matching.
     */
    proficiencyLevel: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2", "none"],
      default: "none",
    },

    /**
     * COMPREHENSIVE PLACEMENT TEST RESULTS
     * Stores granular score metrics and AI-generated Linguistic DNA insights.
     */
    placementTest: {
      level: { 
        type: String, 
        enum: ["A1", "A2", "B1", "B2", "C1", "C2", "none"], 
        default: "none" 
      },
      scores: {
        grammar: { type: Number, default: 0 },
        vocabulary: { type: Number, default: 0 },
        speaking: { type: Number, default: 0 },
      },
      insights: { type: String }, 
      completedAt: { type: Date }
    },

    /**
     * italki-STYLE PRICING ARCHITECTURE
     * Multi-tiered lesson templates with automated package discount calculations.
     */
    lessonTemplates: [
      {
        title: { type: String, required: true },
        description: { type: String },
        priceSingle: { type: Number, default: 0 }, 
        packageFiveDiscount: { type: Number, default: 0 }, 
        isActive: { type: Boolean, default: true }
      }
    ],

    /**
     * REGIONAL & LOGISTICAL SETTINGS
     */
    hourlyRate: { type: Number, min: 0 }, 
    languages: [{ type: String, trim: true }],
    country: { type: String, trim: true },
    timezone: { type: String, trim: true },

    /**
     * PLATFORM ANALYTICS & AGGREGATES
     * Summary data used for performance dashboards and payout history.
     */
    totalEarnings: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },

    /**
     * ACCOUNT LIFECYCLE TRACKING
     */
    lastLogin: { type: Date },
    verified: { type: Boolean, default: false },
  },
  { 
    timestamps: true 
  }
);

/* -------------------------------------------------------------------------- */
/* DATABASE INDEXES                                                           */
/* -------------------------------------------------------------------------- */

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isTutor: 1 });
UserSchema.index({ tutorStatus: 1 });

/* -------------------------------------------------------------------------- */
/* MIDDLEWARE & INSTANCE METHODS                                              */
/* -------------------------------------------------------------------------- */

/**
 * Pre-Save Hook: Password Hashing
 * Automatically hashes the user password using salt rounds before persistence.
 * Logic triggers ONLY when the 'password' field is modified.
 */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Method: comparePassword
 * Verifies if a raw input password matches the stored bcrypt hash.
 */
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Method: summary
 * Returns a sterilized user object for front-end session consumption.
 * Removes sensitive fields like hashed passwords and recovery tokens.
 */
UserSchema.methods.summary = function () {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    isTutor: this.isTutor,
    isAdmin: this.isAdmin,
    country: this.country,
    timezone: this.timezone,
    totalLessons: this.totalLessons,
    totalEarnings: this.totalEarnings,
    tutorStatus: this.tutorStatus || "none",
    proficiencyLevel: this.proficiencyLevel || "none",
    placementTest: this.placementTest || null, 
    lessonTemplates: this.lessonTemplates || []
  };
};

module.exports = mongoose.model("User", UserSchema);
