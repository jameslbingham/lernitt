const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // booking|confirm|reschedule|cancel|complete|payout
  title: { type: String, required: true },
  message: { type: String, default: '' },
  data: { type: Object, default: {} },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
