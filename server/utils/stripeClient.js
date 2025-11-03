// /server/utils/stripeClient.js
// Mock-safe Stripe client: works in both VITE_MOCK=1 and VITE_MOCK=0

const Stripe = require("stripe");

// Treat either condition as "mock mode":
// - Explicit VITE_MOCK=1
// - Missing STRIPE_CONNECT_SECRET (no real key available)
const isMock =
  String(process.env.VITE_MOCK) === "1" ||
  !process.env.STRIPE_CONNECT_SECRET ||
  process.env.STRIPE_CONNECT_SECRET.trim() === "";

if (isMock) {
  // Lightweight stub that mimics the minimal methods our routes call.
  // It returns plausible objects so your code can proceed without throwing.
  const nowId = (prefix) => `${prefix}_mock_${Date.now()}`;

  const stripeStub = {
    accounts: {
      // Used in: POST /payouts/stripe/account
      // Returns an object with an id
      create: async ({ type, email } = {}) => ({
        id: nowId("acct"),
        object: "account",
        type: type || "express",
        email: email || "mock@example.com",
      }),
    },

    accountLinks: {
      // Used in: POST /payouts/stripe/onboard-link
      // Returns an object with a url string
      create: async ({ account, refresh_url, return_url, type } = {}) => ({
        object: "account_link",
        url:
          "https://example.com/mock-stripe-onboarding?acct=" +
          encodeURIComponent(account || "acct_mock"),
        created: Math.floor(Date.now() / 1000),
      }),
    },

    transfers: {
      // Used in: POST /payouts/stripe/transfer/:payoutId
      // Returns an object with an id string
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
  };

  module.exports = stripeStub;
} else {
  // Live mode (has a real key). Keep this exactly as you’d use in production.
  const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET, {
    apiVersion: "2023-10-16",
  });
  module.exports = stripe;
}
