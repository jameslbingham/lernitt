// /server/routes/stripeWebhook.js
const Payment = require('../models/Payment');
const Lesson = require('../models/Lesson');

/**
 * LERNITT ACADEMY - STRIPE WEBHOOK LISTENER v2.2.0
 * ----------------------------------------------------------------------------
 * ROLE: The "Financial Ears" of the platform.
 * Logic: Listens for finalized events from Stripe to trigger academic delivery.
 * ✅ STAGE 11 FIX: Surgically captures 'paymentIntentId' to enable reversals.
 */
module.exports = async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];
  let event;

  // 1. SECURITY HANDSHAKE: Signature Verification
  try {
    if (secret && sig) {
      // Production path: Verify the event actually came from Stripe
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } else {
      /**
       * DEV/SIMULATED MODE
       * Logic: Accepts unsigned JSON for testing in local environments.
       */
      const raw = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
      event = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. TRANSACTION EXECUTION
  try {
    /**
     * CASE A: CHECKOUT SUCCESS (Stage 6 -> Stage 7)
     * Signal: The student has successfully authorized the card payment.
     */
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[Stripe Webhook] Session completed:', session.id);

      /**
       * ✅ PLUMBING FIX: CAPTURING THE REVERSAL KEY
       * session.payment_intent contains the unique ID required to perform
       * a refund in Stage 11. We save it now to prevent a manual lookup later.
       */
      const payment = await Payment.findOneAndUpdate(
        { provider: 'stripe', 'providerIds.checkoutSessionId': session.id },
        { 
          status: 'succeeded',
          $set: { 'providerIds.paymentIntentId': session.payment_intent } 
        },
        { new: true }
      );

      /**
       * ACADEMIC SYNC
       * ✅ FEATURE PRESERVED: Moves lesson status to 'paid' so Join Gate opens.
       */
      if (payment && payment.lesson) {
        const lesson = await Lesson.findById(payment.lesson);
        if (lesson) {
          lesson.status = 'paid';
          lesson.isPaid = true;
          lesson.paidAt = new Date();
          lesson.payment = payment._id;
          await lesson.save();
          console.log(`[Stripe Webhook] Lesson ${lesson._id} logically UNLOCKED for session.`);
        }
      }
    } 

    /**
     * CASE B: PAYMENT FAILURE
     * Signal: The bank rejected the transaction.
     */
    else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      console.log('[Stripe Webhook] Payment failed for intent:', pi.id);
      
      await Payment.findOneAndUpdate(
        { provider: 'stripe', 'providerIds.paymentIntentId': pi.id },
        { status: 'failed' },
        { new: true }
      );
    }

    /**
     * CASE C: IGNORED EVENTS
     * Logic: Stripe sends dozens of events; we only care about completion/failure.
     */
    else {
      // console.log('[Stripe Webhook] Received unhandled event type:', event.type);
    }

    // Always acknowledge within 2 seconds to Stripe
    return res.json({ received: true });

  } catch (e) {
    console.error('[Stripe Webhook] Internal handler error:', e);
    return res.status(500).send('Server error handling Stripe webhook.');
  }
};
