// /server/routes/paypalWebhook.js
const Payment = require('../models/Payment');
const Lesson = require('../models/Lesson');

/**
 * LERNITT ACADEMY - PAYPAL WEBHOOK LISTENER v2.1.0
 * ----------------------------------------------------------------------------
 * ROLE: The "Key Catcher." This module listens for signals from PayPal and
 * updates the platform ledger.
 * ✅ STAGE 11 FIX: Surgically extracts and saves 'captureId' for reversals.
 */
module.exports = async (req, res) => {
  // In dev/simulated mode we accept plain JSON (no signature verification)
  const event = req.body || {};

  try {
    const type = event.event_type || event.type; // allow simple tests
    const resource = event.resource || {};
    
    /**
     * 1. IDENTIFY THE TRANSACTION ID
     * Logic: PayPal webhooks bury the 'Order ID' in different fields 
     * depending on the specific event type.
     */
    let orderId =
      resource.id ||
      resource?.supplementary_data?.related_ids?.order_id ||
      resource?.payment_source?.paypal?.order_id ||
      null;

    /**
     * 2. IDENTIFY THE CAPTURE ID (STAGE 11 PLUMBING)
     * Logic: This is the 'Master Key' required for card/wallet reversals.
     * In a COMPLETED event, the resource.id is the actual Capture ID.
     */
    const captureId = type === 'PAYMENT.CAPTURE.COMPLETED' ? resource.id : null;

    if (!orderId && !captureId) {
      console.log('[PayPal Webhook] No identifier found for type:', type);
      return res.json({ received: true, ignored: true });
    }

    /* ------------------------------------------------------------------------
       CASE A: SUCCESSFUL PAYMENT (ORDER APPROVED OR CAPTURE COMPLETED)
       ------------------------------------------------------------------------ */
    if (type === 'CHECKOUT.ORDER.APPROVED' || type === 'PAYMENT.CAPTURE.COMPLETED') {
      
      // Look for the payment using the Order ID we saved in payments.js
      const lookupId = resource?.supplementary_data?.related_ids?.order_id || orderId;

      const updated = await Payment.findOneAndUpdate(
        { provider: 'paypal', 'providerIds.orderId': lookupId },
        { 
          status: 'succeeded',
          // ✅ PLUMBING FIX: We save the captureId so Bob can refund this later
          $set: { 'providerIds.captureId': captureId || resource.id }
        },
        { new: true }
      );

      /**
       * ACADEMIC DASHBOARD SYNC
       * ✅ FEATURE PRESERVED: Automatically updates lesson status to 'paid'
       * so the Join Button appears for the student and tutor.
       */
      if (updated && updated.lesson) {
        await Lesson.findByIdAndUpdate(updated.lesson, {
          status: 'paid',
          isPaid: true,
          paidAt: new Date()
        });
      }

      console.log(`[PayPal Webhook] Success: ${lookupId} | Saved Capture: ${captureId || resource.id}`);
    } 

    /* ------------------------------------------------------------------------
       CASE B: DENIED PAYMENT
       ------------------------------------------------------------------------ */
    else if (type === 'PAYMENT.CAPTURE.DENIED') {
      const updated = await Payment.findOneAndUpdate(
        { provider: 'paypal', 'providerIds.orderId': orderId },
        { status: 'failed' },
        { new: true }
      );
      console.log('[PayPal Webhook] Denied:', orderId);
    } 

    /* ------------------------------------------------------------------------
       CASE C: IGNORED EVENTS (AUTHORIZED, CREATED, ETC)
       ------------------------------------------------------------------------ */
    else {
      console.log('[PayPal Webhook] Ignored type:', type);
    }

    // Always acknowledge receipt to PayPal within 2 seconds to avoid retries
    return res.json({ received: true });

  } catch (e) {
    console.error('[PayPal Webhook] Internal Handler Error:', e);
    return res.status(500).send('Server error handling PayPal webhook.');
  }
};
