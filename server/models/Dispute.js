// /server/models/Dispute.js
const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'rejected'], default: 'open' },
    resolution: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dispute', DisputeSchema);
