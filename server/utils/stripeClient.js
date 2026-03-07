/**
 * ============================================================================
 * LERNITT ACADEMY - CENTRAL STRIPE ADAPTER (stripeClient.js)
 * ============================================================================
 * VERSION: 11.2.0 (STAGE 11 REFUND PLUMBING SEALED)
 * ----------------------------------------------------------------------------
 * ROLE:
 * This module acts as the "Commercial Gateway" for all card-based transactions.
 * It manages the lifecycle of money ENTERING (Stage 6) and LEAVING (Stage 10/11)
 * the platform.
 * ----------------------------------------------------------------------------
 * CORE CAPABILITIES:
 * 1. MOCK SAFETY: Detects 'VITE_MOCK=1' to provide simulated bank responses,
 * allowing Bob to test payouts and refunds without real capital risk.
 * 2. ONBOARDING (Stage 10): Manages Stripe Express account creation for tutors.
 * 3. TRANSFERS (Stage 10): Executes the 85% share movement to tutor banks.
 * 4. REFUNDS (Stage 11): NEW! Reverses transactions back to student cards.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - NO TRUNCATION: This is a 100% complete, copy-pasteable production file.
 * - ZERO FEATURE LOSS: All existing onboarding and transfer stubs are kept.
 * ============================================================================
 */

const Stripe = require("stripe");

/**
 * 1. ENVIRONMENT DETECTION
 * ----------------------------------------------------------------------------
 * Treat either condition as "mock mode":
 * - Explicit VITE_MOCK=1 in your .env
 * - Missing STRIPE_CONNECT_SECRET (no real key available)
 */
const isMock =
  String(process.env.VITE_MOCK) === "1" ||
  !process.env.STRIPE_CONNECT_SECRET ||
  process.env.STRIPE_CONNECT_SECRET.trim() === "";

if (isMock) {
  /**
   * 2. THE SIMULATION VALVE (MOCK MODE)
   * --------------------------------------------------------------------------
   * Lightweight stub that mimics the official Stripe Node.js SDK.
   */
  const nowId = (prefix) => `${prefix}_mock_${Date.now()}`;

  const stripeStub = {
    /**
     * ACCOUNTS (Stage 10)
     * Used for onboarding tutors to Stripe Express.
     */
    accounts: {
      create: async ({ type, email } = {}) => ({
        id: nowId("acct"),
        object: "account",
        type: type || "express",
        email: email || "mock@example.com",
      }),
    },

    /**
     * ACCOUNT LINKS (Stage 10)
     * Generates the simulated URL for the tutor onboarding portal.
     */
    accountLinks: {
      create: async ({ account, refresh_url, return_url, type } = {}) => ({
        object: "account_link",
        url:
          "https://example.com/mock-stripe-onboarding?acct=" +
          encodeURIComponent(account || "acct_mock"),
        created: Math.floor(Date.now() / 1000),
      }),
    },

    /**
     * TRANSFERS (Stage 10)
     * Mimics moving the 85% lesson fee to the tutor's connected account.
     */
    transfers: {
      create: async ({ amount, currency, destination, metadata } = {}) => ({
        id: nowId("tr"),
        object: "transfer",
        amount: Number.isFinite(amount) ? amount : 0,
        currency: (currency || "eur").toLowerCase(),
        destination: destination || nowId("acct"),
        metadata: metadata || {},
        status: "succeeded",
      }),
    },

    /**
     * ✅ NEW: REFUNDS (Stage 11)
     * ------------------------------------------------------------------------
     * Logic: Simulates a successful money reversal to the student's card.
     * Handshake: Uses the 'payment_intent' ID saved during Stage 6 booking.
     */
    refunds: {
      create: async ({ payment_intent, amount, reason, metadata } = {}) => {
        console.log(`🛠️ [STRIPE MOCK] Reversing funds for PI: ${payment_intent}`);
        
        return {
          id: nowId("re"),
          object: "refund",
          amount: amount || 0,
          currency: "eur",
          payment_intent: payment_intent,
          status: "succeeded",
          reason: reason || "requested_by_customer",
          metadata: metadata || {}
        };
      }
    }
  };

  console.log("✅ STRIPE PLUMBING: Mock Simulation Engine Active.");
  module.exports = stripeStub;

} else {
  /**
   * 3. THE LIVE FAUCET (PRODUCTION MODE)
   * --------------------------------------------------------------------------
   * Official production connection using your real Stripe Secret Key.
   */
  const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET, {
    apiVersion: "2023-10-16",
  });

  console.log("🚀 STRIPE PLUMBING: Live Bank Connection Established.");
  module.exports = stripe;
}

/**
 * ============================================================================
 * END OF FILE: stripeClient.js
 * VERIFICATION: 100% Feature-Complete. Stage 10 & 11 Plumbing Sealed.
 * ============================================================================
 */
