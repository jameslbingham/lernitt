// /server/models/Lesson.js
// ======================================================================
// FINAL COMPLETE LESSON MODEL — MERGED WITH LESSON TYPES & PACKAGES
// ======================================================================

const mongoose = require("mongoose");
const { Schema } = mongoose;

const LessonSchema = new Schema(
  {
    // ---------------- BASIC RELATION FIELDS ----------------
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
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    durationMins: {
      type: Number,
      default: null,
    },

    // ---------------- LESSON TYPES & PACKAGES (NEW) ----------------
    // Identifies which of the 8 types was chosen (e.g., "Business English")
    lessonTypeTitle: { 
      type: String, 
      default: "General Lesson" 
    },
    // Tracks if this is a single lesson or a 5-lesson package
    isPackage: { 
      type: Boolean, 
      default: false 
    },
    packageSize: { 
      type: Number, 
      default: 1 // 1 for single, 5 for package
    },
    // The specific dollar discount applied by the tutor for this package
    discountApplied: { 
      type: Number, 
      default: 0 
    },

    // ---------------- META ----------------
    subject: { type: String, default: "" },
    price: { type: Number, default: 0 },
    isTrial: { type: Boolean, default: false },

    // ---------------- STATUS ----------------
    status: {
      type: String,
      enum: [
        "booked",
        "paid",
        "confirmed",
        "completed",
        "cancelled",
        "expired",
        "reschedule_requested",
      ],
      default: "booked",
    },

    // ---------------- RESCHEDULING ----------------
    rescheduleRequest: {
      requested: { type: Boolean, default: false },
      newStart: { type: Date },
      reason: { type: String },
    },

    // =====================================================================
    //                         AI AGENT SYSTEM
    // =====================================================================
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
// SUMMARY HELPER (Updated to include new fields)
// ======================================================================
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
    lessonTypeTitle: this.lessonTypeTitle, // Added
    isPackage: this.isPackage,             // Added
    packageSize: this.packageSize,         // Added
    isTrial: this.isTrial,
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
LessonSchema.index({ 
  tutor: 1, 
  status: 1, 
  startTime: 1, 
  endTime: 1 
});

LessonSchema.index({ student: 1, startTime: -1 });

module.exports = mongoose.model("Lesson", LessonSchema);
