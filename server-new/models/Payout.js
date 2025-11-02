// /server/models/Payout.js
const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Payout
 * - Stores both `amountCents` (integer) and `amount` (decimal base units) so:
 *   - Aggregations in MongoDB can sum on a stored numeric field (`amount`)
 *   - Payments logic can safely use integer cents (`amountCents`)
 * - Hooks keep both fields in sync.
 *
 * Status notes:
 *   - 'queued'     : awaiting processing
 *   - 'processing' : transfer in-flight
 *   - 'paid'       : manually marked as paid (admin bulk action)
 *   - 'succeeded'  : programmatic transfer (e.g., Stripe) succeeded
 *   - 'failed'     : transfer failed
 */
const PayoutSchema = new Schema(
  {
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    tutor:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Monetary amounts
    amountCents: { type: Number, required: true, min: 0 },
    amount:      { type: Number, required: true, min: 0 }, // stored base-unit (e.g., EUR/USD)

    currency: {
      type: String,
      default: 'EUR',
      set: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      trim: true,
    },

    // Provider transfer metadata
    provider:   { type: String, enum: ['stripe', 'paypal'], required: true },
    providerId: { type: String },

    // Lifecycle
    status: {
      type: String,
      enum: ['queued', 'processing', 'paid', 'succeeded', 'failed'],
      default: 'queued',
      index: true,
    },
    error:   { type: String },

    // Admin/manual fields used by bulk mark-paid route
    paidAt: { type: Date },
    txnId:  { type: String },
    note:   { type: String },
  },
  { timestamps: true }
);

/* ----------------------------- Indexes ----------------------------- */
PayoutSchema.index({ tutor: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, createdAt: -1 });

/* ------------------------ Amount sync helpers ---------------------- */
/**
 * Ensure `amount` and `amountCents` stay in sync.
 * Priority:
 *  - If both provided, trust amountCents and recompute amount.
 *  - Else if amount provided, derive amountCents.
 *  - Else if amountCents provided, derive amount.
 */
function syncAmounts(doc) {
  const hasAmount = typeof doc.amount === 'number' && !Number.isNaN(doc.amount);
  const hasCents  = typeof doc.amountCents === 'number' && Number.isInteger(doc.amountCents);

  if (hasCents) {
    // cents is source of truth
    doc.amount = Math.round((doc.amountCents / 100) * 100) / 100;
  } else if (hasAmount) {
    // derive cents from amount
    doc.amountCents = Math.round(doc.amount * 100);
  }
}

PayoutSchema.pre('validate', function (next) {
  syncAmounts(this);
  next();
});

PayoutSchema.pre('save', function (next) {
  syncAmounts(this);
  next();
});

/* ----------------------------- Virtuals ---------------------------- */
/**
 * Keep a convenience virtual that always reflects cents -> base units.
 * (Note: not used for aggregation; use stored `amount` for that.)
 */
PayoutSchema.virtual('amountFormatted').get(function () {
  const v = typeof this.amount === 'number' ? this.amount : (this.amountCents || 0) / 100;
  return v.toFixed(2);
});

/* ------------------------------ Methods ---------------------------- */
PayoutSchema.methods.markProcessing = function () {
  this.status = 'processing';
  this.error = undefined;
  return this.save();
};

PayoutSchema.methods.markSucceeded = function (providerId) {
  this.status = 'succeeded';
  this.providerId = providerId || this.providerId;
  this.error = undefined;
  this.paidAt = this.paidAt || new Date();
  return this.save();
};

PayoutSchema.methods.markFailed = function (err) {
  this.status = 'failed';
  this.error = err ? String(err) : 'Unknown error';
  return this.save();
};

/* ------------------------------ Export ----------------------------- */
module.exports = mongoose.model('Payout', PayoutSchema);
