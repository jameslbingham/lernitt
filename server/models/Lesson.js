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
    currency: { type: String, default: "USD" },
    isTrial: { type: Boolean, default: false },
    notes: { type: String, default: "" },

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
    pendingStartTime: { type: Date },
    pendingEndTime: { type: Date },
    rescheduleRequestedAt: { type: Date },
    rescheduleRequestedBy: { type: String },
    rescheduledAt: { type: Date },
    reschedulable: { type: Boolean, default: true },
    cancelledAt: { type: Date },
    cancelledBy: { type: String },
    cancelReason: { type: String },

    // ---------------- RECORDING SYSTEM (PHASE F) ----------------
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

// SUMMARY HELPER
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
