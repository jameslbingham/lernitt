// /server/models/Lesson.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Lesson Schema
 * Used by:
 *  - Payouts (linking tutor, price, currency, isTrial)
 *  - Refunds (links back to lessonId)
 *  - Admin dashboards (metrics, finance, reschedules)
 *
 * Fully compatible with VITE_MOCK=1 and VITE_MOCK=0.
 */

const LessonSchema = new Schema(
  {
    tutor:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    subject: { type: String, required: true, trim: true, maxlength: 100 },

    startTime: { type: Date, required: true },
    endTime:   { type: Date, required: true },

    // Price info
    price:    { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR', trim: true, uppercase: true },

    // Lesson status lifecycle
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },

    // Linked payment + payout flow
    payment:  { type: Schema.Types.ObjectId, ref: 'Payment' },
    payout:   { type: Schema.Types.ObjectId, ref: 'Payout' },
    isPaid:   { type: Boolean, default: false },

    // Free 30-min trial (excluded from payouts)
    isTrial:  { type: Boolean, default: false },

    // Lesson notes and feedback
    notes:    { type: String, trim: true, maxlength: 1000 },

    // Cancellations / rescheduling
    rescheduledAt: { type: Date },
    cancelledAt:   { type: Date },
    cancelledBy:   { type: String, enum: ['student', 'tutor', 'admin'] },
    cancelReason:  { type: String, trim: true },
    reschedulable: { type: Boolean, default: false },

    // Duration in minutes (for analytics)
    durationMins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ----------------------------- Indexes ----------------------------- */
LessonSchema.index({ tutor: 1, startTime: 1 });
LessonSchema.index({ student: 1, startTime: 1 });
LessonSchema.index({ status: 1, createdAt: -1 });

/* ------------------------ Hooks and Helpers ------------------------ */
// Automatically compute duration if not set
LessonSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    const mins = Math.max(0, (this.endTime - this.startTime) / 60000);
    this.durationMins = Math.round(mins);
  }
  next();
});

// Format helper for analytics
LessonSchema.methods.summary = function () {
  return {
    id: String(this._id),
    tutor: this.tutor,
    student: this.student,
    subject: this.subject,
    price: this.price,
    currency: this.currency,
    status: this.status,
    startTime: this.startTime,
    endTime: this.endTime,
    isTrial: this.isTrial,
  };
};

module.exports = mongoose.model('Lesson', LessonSchema);
