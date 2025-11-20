// /server/models/Lesson.js
const mongoose = require("mongoose");

const { Schema } = mongoose;

const lessonSchema = new Schema({
  // Core participants
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

  // Basic lesson info
  subject: {
    type: String,
    default: "",
  },
  price: {
    type: Number, // cents (or EUR if you stored that way)
    default: 0,
  },
  isTrial: {
    type: Boolean,
    default: false,
  },

  // Timing
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  durationMins: {
    type: Number,
  },

  // Status lifecycle
  status: {
    type: String,
    enum: [
      "booked",               // student created, not paid yet
      "paid",                 // paid, awaiting tutor approval
      "confirmed",            // confirmed by tutor
      "completed",            // lesson finished
      "cancelled",            // cancelled
      "expired",              // time passed without completion
      "reschedule_requested", // student requested new time
    ],
    default: "booked",
  },

  // Recording state (for Daily.co + UI)
  recordingActive: {
    type: Boolean,
    default: false,
  },
  recordingId: {
    type: String,
    default: null,
  },
  recordingStartedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  recordingStopVotes: {
    tutor: { type: Boolean, default: false },
    student: { type: Boolean, default: false },
  },

  // Final recording info (webhook + Supabase or Daily URL)
  recordingStatus: {
    type: String,
    default: null, // "available" | "error" | "no-participants" | "expired" | null
  },
  recordingUrl: {
    type: String,
    default: null, // final URL (Supabase or Daily fallback)
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-update updatedAt and durationMins
lessonSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  if (!this.durationMins && this.startTime && this.endTime) {
    const diffMs = this.endTime - this.startTime;
    if (diffMs > 0) {
      this.durationMins = Math.round(diffMs / 60000);
    }
  }

  next();
});

// Small summary helper used by some API responses
lessonSchema.methods.summary = function () {
  return {
    _id: this._id,
    tutor: this.tutor,
    student: this.student,
    subject: this.subject,
    price: this.price,
    isTrial: this.isTrial,
    startTime: this.startTime,
    endTime: this.endTime,
    durationMins: this.durationMins,
    status: this.status,
    recordingActive: this.recordingActive,
    recordingStatus: this.recordingStatus,
    recordingUrl: this.recordingUrl,
  };
};

module.exports = mongoose.model("Lesson", lessonSchema);
