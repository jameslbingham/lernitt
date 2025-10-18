// client/src/lib/mockData.js
// -----------------------------------------------------------------------------
// Centralized mock data + persistence helpers (VITE_MOCK=1)
// Used by: PayoutsTab, RefundsTab, Finance, dashboards
// Safe to import in any component or mock handler
// -----------------------------------------------------------------------------

/**
 * Lightweight localStorage wrapper (namespaced).
 */
const NS = "lernitt.mock";
const KEY = (k) => `${NS}.${k}`;

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY(key));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(KEY(key), JSON.stringify(value));
  } catch {
    /* ignore quota errors in mock mode */
  }
}

function nowISO() {
  return new Date().toISOString();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/**
 * Seed data (only applied once if absent).
 */

const DEFAULT_PAYOUTS = [
  {
    id: genId("pay"),
    tutorId: "tutor_001",
    tutorName: "Bob Tutor",
    method: "paypal",
    paypalEmail: "bob.tutor@example.com",
    currency: "USD",
    amount: 240_00, // cents
    status: "queued", // queued | paid | failed
    createdAt: daysAgo(4),
    paidAt: null,
    notes: "June lessons",
  },
  {
    id: genId("pay"),
    tutorId: "tutor_002",
    tutorName: "Alice Coach",
    method: "bank",
    bankAccountLast4: "4321",
    currency: "EUR",
    amount: 125_50, // cents
    status: "paid",
    createdAt: daysAgo(6),
    paidAt: daysAgo(2),
    notes: "Weekly payout",
  },
  {
    id: genId("pay"),
    tutorId: "tutor_003",
    tutorName: "Carlos Pro",
    method: "paypal",
    paypalEmail: "carlos@example.com",
    currency: "USD",
    amount: 90_00,
    status: "failed",
    createdAt: daysAgo(3),
    paidAt: null,
    failureReason: "PayPal email unverified",
    notes: "Retry needed",
  },
];

const DEFAULT_REFUNDS = [
  {
    id: genId("ref"),
    lessonId: "lesson_101",
    studentId: "student_011",
    studentName: "Eve Learner",
    tutorId: "tutor_001",
    tutorName: "Bob Tutor",
    currency: "USD",
    amount: 30_00,
    reason: "No show (tutor)",
    status: "approved", // pending | approved | denied | canceled | retry
    note: "Auto-approved per policy",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
  },
  {
    id: genId("ref"),
    lessonId: "lesson_102",
    studentId: "student_022",
    studentName: "Marco",
    tutorId: "tutor_002",
    tutorName: "Alice Coach",
    currency: "EUR",
    amount: 18_00,
    reason: "Scheduling conflict",
    status: "pending",
    note: "",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: genId("ref"),
    lessonId: "lesson_103",
    studentId: "student_033",
    studentName: "Nina",
    tutorId: "tutor_003",
    tutorName: "Carlos Pro",
    currency: "USD",
    amount: 25_00,
    reason: "Lesson quality dispute",
    status: "denied",
    note: "Evidence insufficient",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(5),
  },
];

const DEFAULT_FINANCE = {
  generatedAt: nowISO(),
  gmvCents: 1254300,
  platformFeeCents: 188100,
  tutorNetCents: 1066200,
  currencies: ["USD", "EUR"],
  byCurrency: [
    {
      currency: "USD",
      gmvCents: 804300,
      platformFeeCents: 120600,
      tutorNetCents: 683700,
    },
    {
      currency: "EUR",
      gmvCents: 450000,
      platformFeeCents: 67500,
      tutorNetCents: 382500,
    },
  ],
  byDay: Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const gmv = 40000 + Math.floor(Math.random() * 120000);
    const fee = Math.round(gmv * 0.15);
    return {
      date: d.toISOString().slice(0, 10),
      gmvCents: gmv,
      platformFeeCents: fee,
      tutorNetCents: gmv - fee,
    };
  }),
};

/**
 * One-time seeding
 */
function ensureSeed() {
  const seeded = load("seeded", false);
  if (seeded) return;

  save("payouts", DEFAULT_PAYOUTS);
  save("refunds", DEFAULT_REFUNDS);
  save("finance", DEFAULT_FINANCE);
  save("seeded", { at: nowISO(), version: 1 });
}
ensureSeed();

/**
 * Public getters/setters (immutable copies)
 */
export function getPayouts() {
  return structuredClone(load("payouts", []));
}

export function setPayouts(next) {
  save("payouts", next);
  return getPayouts();
}

export function getRefunds() {
  return structuredClone(load("refunds", []));
}

export function setRefunds(next) {
  save("refunds", next);
  return getRefunds();
}

export function getFinanceSummary() {
  // Refresh timestamp on each read to feel “live”
  const f = load("finance", DEFAULT_FINANCE);
  f.generatedAt = nowISO();
  return structuredClone(f);
}

export function setFinanceSummary(next) {
  save("finance", next);
  return getFinanceSummary();
}

/**
 * Convenience updaters
 */
export function markPayoutsPaid(ids, paidAt = nowISO()) {
  const list = getPayouts();
  const set = new Set(ids);
  const updated = list.map((p) =>
    set.has(p.id)
      ? {
          ...p,
          status: "paid",
          paidAt,
          failureReason: undefined,
        }
      : p
  );
  return setPayouts(updated);
}

export function retryFailedPayout(id) {
  const list = getPayouts();
  const updated = list.map((p) =>
    p.id === id
      ? {
          ...p,
          status: "queued",
          paidAt: null,
          failureReason: undefined,
        }
      : p
  );
  return setPayouts(updated);
}

export function updateRefundStatus(id, status, note = "") {
  const list = getRefunds();
  const updated = list.map((r) =>
    r.id === id
      ? {
          ...r,
          status,
          note: note ?? r.note,
          updatedAt: nowISO(),
        }
      : r
  );
  return setRefunds(updated);
}

/**
 * Utilities for totals/metrics (used by footers/KPIs)
 */
export function centsToDisplay(amountCents, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

