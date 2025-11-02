const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    provider: { type: String, enum: ['stripe', 'paypal'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR', uppercase: true },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
    providerIds: {
      paymentIntentId: String,
      clientSecret: String,
      orderId: String,
      captureId: String,
    },
    refundAmount: { type: Number, default: 0 },
    refundProviderId: { type: String },
    refundedAt: { type: Date },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
