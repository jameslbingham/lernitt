// /server/routes/stripeWebhook.js
const Payment = require('../models/Payment');
const Lesson = require('../models/Lesson');

module.exports = async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (secret && sig) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } else {
      // Dev/simulated mode: accept unsigned JSON
      const raw = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
      event = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      console.log('Webhook PI succeeded:', pi.id);

      // Update Payment to succeeded
      const payment = await Payment.findOneAndUpdate(
        { provider: 'stripe', 'providerIds.paymentIntentId': pi.id },
        { status: 'succeeded' },
        { new: true }
      );

      if (payment && payment.lesson) {
        // Update related Lesson lifecycle → paid
        const lesson = await Lesson.findById(payment.lesson);
        if (lesson) {
          lesson.status = 'paid';
          lesson.isPaid = true;
          lesson.paidAt = new Date();
          lesson.payment = payment._id;
          await lesson.save();
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      console.log('Webhook PI failed:', pi.id);

      await Payment.findOneAndUpdate(
        { provider: 'stripe', 'providerIds.paymentIntentId': pi.id },
        { status: 'failed' },
        { new: true }
      );
    } else {
      console.log('Stripe webhook: ignoring event type:', event.type);
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    return res.status(500).send('Server error handling webhook.');
  }
};
