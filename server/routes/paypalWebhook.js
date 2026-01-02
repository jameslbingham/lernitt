// /server/routes/paypalWebhook.js
const Payment = require('../models/Payment');
const Lesson = require('../models/Lesson'); // ✅ ADDED: Required to update lesson status

module.exports = async (req, res) => {
  // In dev/simulated mode we accept plain JSON (no signature verification)
  const event = req.body || {};
  try {
    const type = event.event_type || event.type; // allow simple tests
    const resource = event.resource || {};
    // Try to find the PayPal order ID from the event
    let orderId =
      resource.id ||
      resource?.supplementary_data?.related_ids?.order_id ||
      resource?.payment_source?.paypal?.order_id ||
      null;

    if (!orderId) {
      // Nothing we can match; acknowledge to avoid retries
      console.log('PayPal webhook: no orderId found for type:', type);
      return res.json({ received: true, ignored: true });
    }

    if (
      type === 'CHECKOUT.ORDER.APPROVED' ||
      type === 'PAYMENT.CAPTURE.COMPLETED'
    ) {
      const updated = await Payment.findOneAndUpdate(
        { provider: 'paypal', 'providerIds.orderId': orderId },
        { status: 'succeeded' },
        { new: true }
      );

      // ✅ ADDED: Update Lesson status so dashboard reflects payment
      if (updated && updated.lesson) {
        await Lesson.findByIdAndUpdate(updated.lesson, {
          status: 'paid',
          isPaid: true,
          paidAt: new Date()
        });
      }

      console.log('PayPal succeeded:', orderId, '->', updated?._id || 'none');
    } else if (type === 'PAYMENT.CAPTURE.DENIED') {
      const updated = await Payment.findOneAndUpdate(
        { provider: 'paypal', 'providerIds.orderId': orderId },
        { status: 'failed' },
        { new: true }
      );
      console.log('PayPal failed:', orderId, '->', updated?._id || 'none');
    } else {
      console.log('PayPal webhook ignored type:', type);
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('PayPal webhook handler error:', e);
    return res.status(500).send('Server error handling PayPal webhook.');
  }
};
