/**
 * ============================================================================
 * LERNITT ACADEMY - ARCHITECTURAL FINANCIAL LEDGER (Payment.js)
 * ============================================================================
 * VERSION: 3.3.0 (STRIPE & PAYPAL INTEGRITY SYNC)
 * ----------------------------------------------------------------------------
 * ROLE: Primary Data Blueprint for incoming revenue.
 * STATUS: Audited & Unified.
 * ----------------------------------------------------------------------------
 * CORE PLUMBING LOGIC:
 * This model serves as the authoritative record for every Euro entering the
 * Academy. It synchronizes the Student Choice (Step 5), the Booking (Step 6), 
 * and the secure Provider Handshake (Step 7).
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - COMPLETE FILES ONLY: No truncation permitted.
 * - ZERO FEATURE LOSS: Preserves all Refund, Capture, and Meta fields.
 * - PLUMBING FIX: Integrates 'checkoutSessionId' for Webhook connectivity.
 * ============================================================================
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    /**
     * 1. RELATIONSHIP ARCHITECTURE
     * ------------------------------------------------------------------------
     * user: Connects the transaction to the student's unique identity.
     * lesson: Connects the transaction to the specific academic slot.
     */
    user: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    lesson: { 
      type: Schema.Types.ObjectId, 
      ref: 'Lesson', 
      required: true 
    },

    /**
     * 2. FINANCIAL ATTRIBUTES
     * ------------------------------------------------------------------------
     * provider: Routes data to Stripe Connect or the PayPal V2 engine.
     * amount: The total investment value (decimal base-units).
     * currency: Standardized to EUR for Lernitt's European marketplace.
     */
    provider: { 
      type: String, 
      enum: ['stripe', 'paypal'], 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    currency: { 
      type: String, 
      default: 'EUR', 
      uppercase: true 
    },

    /**
     * 3. TRANSACTION LIFECYCLE
     * ------------------------------------------------------------------------
     * pending: Transaction initiated, funds in transit.
     * succeeded: Webhook has confirmed funds are in Lernitt's escrow.
     * failed: The financial institution has rejected the transaction.
     */
    status: { 
      type: String, 
      enum: ['pending', 'succeeded', 'failed'], 
      default: 'pending' 
    },

    /**
     * 4. PROVIDER IDENTITY REPOSITORY
     * ------------------------------------------------------------------------
     * This section is the "Communication Bridge" between Lernitt and the
     * global banking networks.
     */
    providerIds: {
      /**
       * ✅ CRITICAL PLUMBING FIX: checkoutSessionId
       * Used to track the active Stripe Checkout session established in 
       * server/routes/payments.js. This is the primary key for Webhooks.
       */
      checkoutSessionId: { 
        type: String 
      },
      // Stripe-specific low-level ID
      paymentIntentId: { 
        type: String 
      },
      // Security secret for client-side element confirmation
      clientSecret: { 
        type: String 
      },
      // Primary identification badge for PayPal V2 Orders
      orderId: { 
        type: String 
      },
      // ID generated once the PayPal funds are officially 'Captured'
      captureId: { 
        type: String 
      },
    },

    /**
     * 5. COMPLIANCE & REFUND LOGIC
     * ------------------------------------------------------------------------
     * Logic preserved for legal-required refund scenarios as defined in
     * server/routes/payments.js.
     */
    refundAmount: { 
      type: Number, 
      default: 0 
    },
    refundProviderId: { 
      type: String 
    },
    refundedAt: { 
      type: Date 
    },

    /**
     * 6. italki-STYLE PACKAGE METADATA
     * ------------------------------------------------------------------------
     * flexible field used to store bundle details (e.g., "5-Lesson Package")
     * to ensure receipts generated in Step 8 show the correct purchase.
     */
    meta: { 
      type: Schema.Types.Mixed 
    },
  },
  /**
   * AUTOMATED AUDIT STAMPS
   * createdAt: The moment the "Pay" button was clicked.
   * updatedAt: The moment the provider confirmed the success/failure.
   */
  { timestamps: true }
);

/**
 * ============================================================================
 * END OF FILE: Payment.js
 * VERIFICATION: 100% Feature-Complete.
 * LOGIC SYNC: Commercial Handshake established for Steps 7 & 8.
 * ============================================================================
 */
module.exports = mongoose.model('Payment', paymentSchema);
