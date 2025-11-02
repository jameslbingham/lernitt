require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Payment = require('../models/Payment');

(async () => {
  try {
    const [id, status] = process.argv.slice(2);
    if (!id || !status) {
      console.log('Usage: node scripts/markPaid.js <paymentId> <succeeded|failed|pending>');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const payment = await Payment.findById(id);
    if (!payment) {
      console.error('Payment not found');
      process.exit(1);
    }
    payment.status = status;
    await payment.save();
    console.log('Updated:', { id: payment._id.toString(), status: payment.status });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
