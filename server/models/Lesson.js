// /server/models/Lesson.js
// ======================================================================
// FINAL COMPLETE LESSON MODEL — INCLUDING ALL PHASE F RECORDING FIELDS
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
    //                           RECORDING SYSTEM (PHASE F)
    // =====================================================================

    // Recording is currently active?
    recordingActive: {
      type: Boolean,
      default: false,
    },

    // Daily internal recording ID
    recordingId: {
      type: String,
      default: null,
    },

    // Who started the recording
    recordingStartedBy: {
      type: String,
      default: null,
    },

    // Tutor + student “stop requests”
    recordingStopVotes: {
      tutor: { type: Boolean, default: false },
      student: { type: Boolean, default: false },
    },

    // Final downloadable URL (Supabase or Daily)
    recordingUrl: {
      type: String,
      default: null,
    },

    // “available”, “error”, “no-participants”
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
// SUMMARY HELPER (used by complete-lesson)
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
    isTrial: this.isTrial,
    status: this.status,
    recordingActive: this.recordingActive,
    recordingId: this.recordingId,
    recordingUrl: this.recordingUrl,
    recordingStatus: this.recordingStatus,
  };
};

// ======================================================================
// OPTIMIZED INDEX FOR DOUBLE-BOOKING CLASH GUARD
// ======================================================================
LessonSchema.index({ 
  tutor: 1, 
  status: 1, 
  startTime: 1, 
  endTime: 1 
});

LessonSchema.index({ student: 1, startTime: -1 });

module.exports = mongoose.model("Lesson", LessonSchema);
