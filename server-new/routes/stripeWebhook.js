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
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      console.log('Webhook got PI (succeeded):', pi.id);

      const updated = await Payment.findOneAndUpdate(
        { provider: 'stripe', 'providerIds.paymentIntentId': pi.id },
        { status: 'succeeded' },
        { new: true }
      );
      console.log('Updated doc (succeeded):', updated?._id || 'none');

      // Mark the related lesson as paid
      const intent = event.data.object;
      const payment = await Payment.findOne({
        provider: 'stripe',
        'providerIds.paymentIntentId': intent.id
      });

      if (payment && payment.lesson) {
        await Lesson.findByIdAndUpdate(payment.lesson, {
          isPaid: true,
          payment: payment._id
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      console.log('Webhook got PI (failed):', pi.id);
      const updated = await Payment.findOneAndUpdate(
        { provider: 'stripe', 'providerIds.paymentIntentId': pi.id },
        { status: 'failed' },
        { new: true }
      );
      console.log('Updated doc (failed):', updated?._id || 'none');
    } else {
      console.log('Ignoring event type:', event.type);
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    return res.status(500).send('Server error handling webhook.');
  }
};
