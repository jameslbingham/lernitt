// /server/models/Refund.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Refund model
 * - Compatible with both mock (VITE_MOCK=1) and live (VITE_MOCK=0) modes.
 * - Merges all features from your existing model (notes, history, enums, indexes, helpers)
 *   and keeps fields used by RefundsTab.jsx and the Finance API.
 * - Amount is stored in major currency units (e.g., 25.50 for $25.50).
 */

const NoteSchema = new Schema(
  {
    by:   { type: String, required: true },           // user/admin id or name (string)
    at:   { type: Date,   required: true, default: Date.now },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const HistorySchema = new Schema(
  {
    at:     { type: Date,   required: true, default: Date.now },
    by:     { type: String, required: true },         // actor id or name
    action: {
      type: String,
      required: true,
      enum: ["create", "approve", "deny", "retry", "cancel", "note", "update", "fail"],
    },
    reason: { type: String, trim: true },
    text:   { type: String, trim: true },
  },
  { _id: false }
);

const RefundSchema = new Schema(
  {
    /* -------- Associations -------- */
    lesson:  { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
    student: { type: Schema.Types.ObjectId, ref: "User",   index: true },
    tutor:   { type: Schema.Types.ObjectId, ref: "User",   index: true },

    /* -------- Money -------- */
    amount:   { type: Number, required: true, default: 0, min: 0 }, // major units
    currency: { type: String, required: true, default: "USD", index: true },

    /* -------- Status lifecycle -------- */
    status: {
      type: String,
      required: true,
      enum: ["queued", "pending", "approved", "denied", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    /* -------- Reasons / failure meta -------- */
    reason:        { type: String, trim: true, maxlength: 2000 }, // free text for request/decision
    failureReason: { type: String, trim: true, maxlength: 2000 }, // for "failed" status

    /* -------- Audit stamps -------- */
    approvedAt:  { type: Date },
    approvedBy:  { type: String, trim: true },

    deniedAt:    { type: Date },
    deniedBy:    { type: String, trim: true },

    retriedAt:   { type: Date },
    retriedBy:   { type: String, trim: true },

    cancelledAt: { type: Date },
    cancelledBy: { type: String, trim: true },

    /* -------- UI support -------- */
    notes:   { type: [NoteSchema],    default: [] },
    history: { type: [HistorySchema], default: [] },
  },
  {
    collection: "refunds",
    timestamps: true, // createdAt, updatedAt
  }
);

/* ---------------------------- Indexes ---------------------------- */
// (Keep existing analytics/query indexes and add a few harmless helpful ones)
RefundSchema.index({ createdAt: 1 });
RefundSchema.index({ createdAt: 1, status: 1 });
RefundSchema.index({ tutor: 1, createdAt: 1 });
RefundSchema.index({ student: 1, createdAt: 1 });
RefundSchema.index({ lesson: 1 });
RefundSchema.index({ currency: 1, createdAt: 1 });

/* ---------------------------- Hooks ------------------------------ */
RefundSchema.pre("save", function (next) {
  if (typeof this.reason === "string") this.reason = this.reason.trim();
  if (typeof this.failureReason === "string") this.failureReason = this.failureReason.trim();
  next();
});

/* ---------------------------- Helpers ---------------------------- */
RefundSchema.methods.addHistory = function (entry) {
  this.history.push({ at: new Date(), ...entry });
};

RefundSchema.methods.summary = function () {
  return {
    id: String(this._id),
    status: this.status,
    amount: this.amount,
    currency: this.currency,
    reason: this.reason,
    failureReason: this.failureReason,
    lessonId: this.lesson ? String(this.lesson) : null,
    studentId: this.student ? String(this.student) : null,
    tutorId: this.tutor ? String(this.tutor) : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.Refund || mongoose.model("Refund", RefundSchema);
