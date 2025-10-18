// client/src/mock/payoutsStore.js

const P_KEY = "mock_payouts";
const R_KEY = "mock_refunds";

const nowISO = () => new Date().toISOString();

const load = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const ensureInit = () => {
  if (!localStorage.getItem(P_KEY)) save(P_KEY, []);
  if (!localStorage.getItem(R_KEY)) save(R_KEY, []);
};
ensureInit();

// ---------- Payouts ----------
export const listPayouts = () => load(P_KEY);

export const addPayout = (payout = {}) => {
  const items = load(P_KEY);
  const record = {
    id:
      payout.id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random())),
    status: "queued", // queued | processing | paid | failed
    createdAt: nowISO(),
    provider: payout.provider || "stripe", // or "paypal"
    lessonId: payout.lessonId ?? null,
    amount: payout.amount ?? 0,
    currency: payout.currency || "EUR",
    ...payout,
  };
  items.push(record);
  save(P_KEY, items);
  return record;
};

export const updatePayout = (id, patch = {}) => {
  const items = load(P_KEY);
  const i = items.findIndex((x) => x.id === id);
  if (i === -1) return null;
  items[i] = { ...items[i], ...patch, updatedAt: nowISO() };
  save(P_KEY, items);
  return items[i];
};

// ---------- Refunds ----------
export const listRefunds = () => load(R_KEY);

export const addRefund = (refund = {}) => {
  const items = load(R_KEY);
  const record = {
    id:
      refund.id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random())),
    status: "queued", // queued | processing | refunded | failed
    createdAt: nowISO(),
    provider: refund.provider || "stripe",
    lessonId: refund.lessonId ?? null,
    amount: refund.amount ?? 0,
    currency: refund.currency || "EUR",
    ...refund,
  };
  items.push(record);
  save(R_KEY, items);
  return record;
};

export const updateRefund = (id, patch = {}) => {
  const items = load(R_KEY);
  const i = items.findIndex((x) => x.id === id);
  if (i === -1) return null;
  items[i] = { ...items[i], ...patch, updatedAt: nowISO() };
  save(R_KEY, items);
  return items[i];
};

// ---------- Test helpers (optional) ----------
export const clearPayouts = () => save(P_KEY, []);
export const clearRefunds = () => save(R_KEY, []);

// ---------- Finance.jsx shim exports ----------
export { listPayouts as getPayouts, listRefunds as getRefunds };

// ---------- New helper: createTestPayout ----------
export function createTestPayout(overrides = {}) {
  const payout = {
    provider: "paypal",
    amount: 12345, // €123.45
    currency: "EUR",
    recipient: "tester+mock@example.com",
    status: "queued",
    ...overrides,
  };
  return addPayout(payout);
}
