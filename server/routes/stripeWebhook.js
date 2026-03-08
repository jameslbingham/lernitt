// /server/routes/stripeWebhook.js
/**
 * ============================================================================
 * LERNITT ACADEMY - STRIPE AUTHORITATIVE WEBHOOK LISTENER
 * ============================================================================
 * VERSION: 2.3.0 (PROBLEM 4 MASTER INTEGRATION - STAGE 11 SEALED)
 * ----------------------------------------------------------------------------
 * ROLE: The "Chief Financial Officer" (CFO).
 * This module is the absolute source of truth for card-based transactions.
 * It manages the background handshake between the bank and the database.
 * ----------------------------------------------------------------------------
 * ✅ PROBLEM 4 FIX: Establishes Authoritative Background Processing.
 * Logic: Automatically unlocks lessons and grants bundle credits regardless
 * of the student's internet connection status during the redirect phase.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - NO TRUNCATION: Complete, 100% copy-pasteable production file.
 * - IDEMPOTENCY: Safely ignores duplicate events to prevent double-crediting.
 * ============================================================================
 */

const Payment = require('../models/Payment');
const Lesson = require('../models/Lesson');
const User = require('../models/User');

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
    console.error('[Stripe Webhook] Security violation: Invalid signature.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. TRANSACTION EXECUTION ENGINE
  try {
    /**
     * CASE A: CHECKOUT SUCCESS (Stage 6 -> Stage 7)
     * Signal: The bank has authorized the student's payment.
     */
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[Stripe Webhook] Success: Banking handshake finalized for session', session.id);

      /**
       * AUTHORITATIVE LEDGER UPDATE
       * Logic: Mark payment 'succeeded' and surgically save the paymentIntentId.
       * Requirement: This ID is mandatory for Bob to process refunds in Stage 11.
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
       * ✅ ACADEMIC UNLOCK (AUTHORITATIVE)
       * Logic: We check if the lesson is already paid. If not, we unlock it now.
       * This is the "Safety Valve" that fixes Problem 4.
       */
      if (payment && payment.lesson) {
        const lesson = await Lesson.findById(payment.lesson);
        
        // Idempotency Guard: Only update if the lesson isn't already 'paid'
        if (lesson && lesson.status !== 'paid') {
          lesson.status = 'paid';
          lesson.isPaid = true;
          lesson.paidAt = new Date();
          lesson.payment = payment._id;
          await lesson.save();

          /**
           * ✅ italki BUNDLE CREDIT GRANT (AUTHORITATIVE)
           * Logic: If the student bought a 5-pack, we automatically grant 4 
           * remaining credits to their profile in the background.
           */
          if (lesson.isPackage) {
            const creditCount = (lesson.packageSize || 5) - 1;
            
            // Handshake with the student's credit vault in User model
            const creditUpdate = await User.updateOne(
              { _id: lesson.student, "packageCredits.tutorId": lesson.tutor },
              { $inc: { "packageCredits.$.count": creditCount } }
            );

            // Logic: Create the vault entry if this is their first bundle with this tutor
            if (creditUpdate.matchedCount === 0) {
              await User.updateOne(
                { _id: lesson.student },
                { $push: { packageCredits: { tutorId: lesson.tutor, count: creditCount } } }
              );
            }
            console.log(`[CFO] Granted ${creditCount} bundle credits to Student ${lesson.student}`);
          }

          console.log(`[CFO] Lesson ${lesson._id} UNLOCKED for session via Background Webhook.`);
        }
      }
    } 

    /**
     * CASE B: PAYMENT FAILURE
     * Signal: The financial institution has rejected the card.
     */
    else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      console.log('[Stripe Webhook] Alert: Payment rejection for intent:', pi.id);
      
      await Payment.findOneAndUpdate(
        { provider: 'stripe', 'providerIds.paymentIntentId': pi.id },
        { status: 'failed' },
        { new: true }
      );
    }

    /**
     * CASE C: TERMINAL REFUND NOTIFICATION (STAGE 11)
     * Signal: Bob's refund command has been finalized by Stripe.
     */
    else if (event.type === 'charge.refunded') {
       const charge = event.data.object;
       console.log('[Stripe Webhook] Refund Handshake: Reversal finalized for Charge', charge.id);
       // We log this for audit purposes; the primary ledger update happens in payments.js
    }

    // Always acknowledge within 2 seconds to Stripe to prevent event retries
    return res.json({ received: true });

  } catch (e) {
    console.error('[Stripe Webhook] Internal pipeline failure:', e);
    return res.status(500).send('Server error handling Stripe webhook.');
  }
};
