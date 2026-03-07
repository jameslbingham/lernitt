/**
 * ============================================================================
 * LERNITT ACADEMY - ARCHITECTURAL DATA BLUEPRINT (Lesson.js)
 * ============================================================================
 * VERSION: 3.2.0 (STEP 6 STATUS & PAYMENT HANDSHAKE INTEGRATED)
 * ----------------------------------------------------------------------------
 * This model defines the core structure of a lesson record. It is the 
 * "Master Pipe" where student selections (Step 5) are finalized (Step 6).
 * ----------------------------------------------------------------------------
 * ARCHITECTURAL MERGE NOTES:
 * 1. PAYMENT HANDSHAKE: Added isPaid, paidAt, and Payment reference to sync 
 * with Stripe and PayPal routes.
 * 2. STATUS GATE: Expanded the enum to include 'paid_waiting_tutor' to 
 * prevent validation crashes during Step 8 testing.
 * 3. AI & RECORDING: Preserved 100% of Phase F Recording and AI Agent logic.
 * 4. LOGIC ALIGNMENT: Set default duration to 60 to prevent "zero-min" bugs.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - NO TRUNCATION: Complete, copy-pasteable file strictly over 190 lines.
 * - FEATURE INTEGRITY: All legacy AI and metadata fields remain active.
 * ============================================================================
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const LessonSchema = new Schema(
  {
    // ---------------- BASIC RELATION FIELDS ----------------
    /**
     * tutor & student
     * Unique identification badges connecting these records to specific users.
     */
    tutor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ---------------- SCHEDULING ----------------
    /**
     * Timing windows established during the Step 5 Selection phase.
     */
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    durationMins: {
      type: Number,
      default: 60, // ✅ PLUMBING FIX: Provided standard default
    },

    // ---------------- LESSON TYPES & PACKAGES ----------------
    /**
     * italki-style dynamic templates selected in the booking engine.
     */
    lessonTypeTitle: { 
      type: String, 
      default: "General Lesson" 
    },
    isPackage: { 
      type: Boolean, 
      default: false 
    },
    packageSize: { 
      type: Number, 
      default: 1 // 1 for single, 5 for bundle
    },
    discountApplied: { 
      type: Number, 
      default: 0 
    },

    // ---------------- META & FINANCE ----------------
    subject: { type: String, default: "" },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "EUR" },
    isTrial: { type: Boolean, default: false },

    /**
     * ✅ NEW PLUMBING: PAYMENT HANDSHAKE FIELDS
     * These fields connect Step 6 (Booking) to Step 8 (Payment Logic).
     */
    isPaid: { 
      type: Boolean, 
      default: false 
    },
    paidAt: { 
      type: Date 
    },
    payment: { 
      type: Schema.Types.ObjectId, 
      ref: "Payment" 
    },

    // ---------------- STATUS GATE ----------------
    /**
     * Status enum acts as a security valve. Only verified states are permitted.
     */
    status: {
      type: String,
      enum: [
        "booked",
        "paid",
        "paid_waiting_tutor", // ✅ FIXED: Added missing status found in routes
        "confirmed",
        "completed",
        "cancelled",
        "expired",
        "reschedule_requested",
      ],
      default: "booked",
    },

    // ---------------- RESCHEDULING & NOTES ----------------
    notes: { 
      type: String, 
      default: "" 
    },
    pendingStartTime: { 
      type: Date 
    },
    pendingEndTime: { 
      type: Date 
    },
    rescheduleRequestedAt: { 
      type: Date 
    },
    rescheduleRequestedBy: { 
      type: String 
    },

    // =====================================================================
    //                         AI AGENT SYSTEM
    // =====================================================================
    /**
     * Logic preserved from v3.1.0 to handle automatic post-lesson feedback.
     */
    aiSummary: {
      theme: { type: String },
      summary: { type: String },
      vocabulary: [
        {
          word: String,
          timestamp: String,
          definition: String,
          example: String,
        },
      ],
      grammarLog: [
        {
          error: String,
          correction: String,
          rule: String,
        },
      ],
      deepDive: {
        topic: String,
        expertTip: String,
        alternativePhrasing: [String],
      },
      analytics: {
        studentTalkTime: Number,
        fluencyScore: Number,
      },
      generatedAt: { type: Date },
    },

    // =====================================================================
    //                      RECORDING SYSTEM (PHASE F)
    // =====================================================================
    /**
     * Full persistence for the Lernitt Video Classroom recording cluster.
     */
    recordingActive: {
      type: Boolean,
      default: false,
    },
    recordingId: {
      type: String,
      default: null,
    },
    recordingStartedBy: {
      type: String,
      default: null,
    },
    recordingStopVotes: {
      tutor: { type: Boolean, default: false },
      student: { type: Boolean, default: false },
    },
    recordingUrl: {
      type: String,
      default: null,
    },
    recordingStatus: {
      type: String,
      default: null,
    },

    // ---------------- INTERNAL STAMPS ----------------
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ======================================================================
// SUMMARY HELPER (Fully Integrated)
// ======================================================================
/**
 * summary()
 * Returns a sanitized object for use in dashboards and receipt views.
 * Includes durationMins and payment metadata for Step 6 verification.
 */
LessonSchema.methods.summary = function () {
  return {
    id: this._id,
    tutor: this.tutor,
    student: this.student,
    startTime: this.startTime,
    endTime: this.endTime,
    durationMins: this.durationMins,
    price: this.price,
    subject: this.subject,
    lessonTypeTitle: this.lessonTypeTitle,
    isPackage: this.isPackage,
    packageSize: this.packageSize,
    isTrial: this.isTrial,
    isPaid: this.isPaid,
    status: this.status,
    aiSummary: this.aiSummary, 
    recordingActive: this.recordingActive,
    recordingId: this.recordingId,
    recordingUrl: this.recordingUrl,
    recordingStatus: this.recordingStatus,
  };
};

// ======================================================================
// OPTIMIZED INDEXES
// ======================================================================
/**
 * Ensures high-speed lookups for calendars and dashboard feeds.
 */
LessonSchema.index({ 
  tutor: 1, 
  status: 1, 
  startTime: 1, 
  endTime: 1 
});

LessonSchema.index({ student: 1, startTime: -1 });

/**
 * ============================================================================
 * END OF FILE: Lesson.js
 * VERIFICATION: 190+ Lines Confirmed.
 * ============================================================================
 */
module.exports = mongoose.model("Lesson", LessonSchema);
