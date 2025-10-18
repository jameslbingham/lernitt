// client/src/lib/api.js
// ============================================================================
// API helper layer (mock-safe, backwards-compatible)
// ----------------------------------------------------------------------------
// - Keeps approveRefund(id, reason) and denyRefund(id, reason) exactly as named
// - Adds JWT (localStorage.token) automatically
// - Adds safeFetchJSON with VITE_MOCK=1 fallbacks for local dev
// - Exposes extra helpers used by Admin tabs (Users, Tutors, Finance, Refunds)
// ============================================================================

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/* --------------------------------- Core --------------------------------- */

/**
 * safeFetchJSON
 * Adds JSON header + Authorization: Bearer <token> (if present).
 * Parses JSON (returns {} if empty body).
 * If request fails and VITE_MOCK=1, returns minimal sensible fallbacks.
 */
export async function safeFetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  try {
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    if (!IS_MOCK) throw err;

    // ---- Minimal mock fallbacks by endpoint shape ----
    // Collections
    if (url.endsWith("/api/admin/users") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          {
            id: "u1", name: "Mock Student", email: "student@example.com", role: "student",
            status: "active", verified: true, lessonsCount: 7, spent: 120.5,
            locale: "en-US", createdAt: new Date(Date.now()-864e5*90).toISOString(), lastActive: new Date().toISOString(),
          },
          {
            id: "u2", name: "Mock Tutor", email: "tutor@example.com", role: "tutor",
            status: "active", verified: true, lessonsCount: 240, spent: 0,
            locale: "en-GB", createdAt: new Date(Date.now()-864e5*200).toISOString(), lastActive: new Date().toISOString(),
          },
        ],
      };
    }
    if (url.endsWith("/api/admin/tutors") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          { id:"t1", name:"Bob Tutor",  email:"bob@example.com",  langs:["en","es"], rate:18, currency:"USD", rating:4.9, lessons:312, status:"approved",  featured:true,  verified:true,  createdAt:new Date(Date.now()-864e5*120).toISOString() },
          { id:"t2", name:"Dana Coach", email:"dana@example.com", langs:["en","fr"], rate:22, currency:"EUR", rating:4.6, lessons:141, status:"pending",   featured:false, verified:false, createdAt:new Date(Date.now()-864e5*20).toISOString() },
        ],
      };
    }
    if (url.endsWith("/api/payouts") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          { id:"P1", tutor:"Bob Tutor", amount:120, currency:"USD", status:"queued", createdAt:new Date().toISOString() },
          { id:"P2", tutor:"Dana Coach", amount:220, currency:"EUR", status:"paid",   createdAt:new Date(Date.now()-864e5).toISOString() },
        ],
      };
    }
    if (url.endsWith("/api/refunds") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          {
            id: "R1",
            lessonId: "L2101",
            student: { id: "u1", name: "Alice Student", email: "alice@example.com" },
            tutor:   { id: "t1", name: "Bob Tutor",    email: "bob@example.com" },
            amount: 25, currency: "USD",
            reason: "Mocked: lesson quality concerns",
            status: "queued",
            notes: [],
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
    if (url.endsWith("/api/finance/summary") && (!opts.method || opts.method === "GET")) {
      return {
        totals: { earnings: 10234, payouts: 8000, refunds: 500 },
        tutors: [
          { id: "t1", name: "Bob Tutor",  earnings: 4200, lessons: 120 },
          { id: "t2", name: "Dana Coach", earnings: 3200, lessons: 90 },
        ],
        trends: [
          { month: "2025-06", earnings: 2000 },
          { month: "2025-07", earnings: 3000 },
          { month: "2025-08", earnings: 2500 },
          { month: "2025-09", earnings: 1734 },
        ],
        totalRefunds: 234, approvedRefunds: 180, deniedRefunds: 42, pendingRefunds: 12,
        refundTrends: Array.from({ length: 30 }).map((_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
          amount: Math.round(Math.random() * 100),
        })),
      };
    }

    // Refund action endpoints
    if (url.includes("/api/refunds/") && /\/(approve|deny|retry|cancel)$/.test(url)) {
      const action = url.split("/").pop();
      const map = { approve: "approved", deny: "denied", retry: "queued", cancel: "cancelled" };
      return { ok: true, status: map[action] || "queued" };
    }
    if (url.includes("/api/refunds/") && url.endsWith("/note")) {
      const body = opts?.body ? JSON.parse(opts.body) : {};
      return { ok: true, note: { by: "admin", at: new Date().toISOString(), text: body?.text || "" } };
    }

    return {};
  }
}

/* ------------------------------ Refunds API ------------------------------ */

/**
 * Approve a refund (BACKWARDS-COMPATIBLE EXPORT)
 * Signature preserved: approveRefund(id, reason)
 */
export async function approveRefund(id, reason) {
  // use server base URL + JWT + mock fallbacks
  return safeFetchJSON(`${API}/api/refunds/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * Deny a refund (BACKWARDS-COMPATIBLE EXPORT)
 * Signature preserved: denyRefund(id, reason)
 */
export async function denyRefund(id, reason) {
  return safeFetchJSON(`${API}/api/refunds/${encodeURIComponent(id)}/deny`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/** Retry a failed refund */
export async function retryRefund(id) {
  return safeFetchJSON(`${API}/api/refunds/${encodeURIComponent(id)}/retry`, { method: "POST" });
}

/** Cancel a queued/approved refund (policy-dependent) */
export async function cancelRefund(id) {
  return safeFetchJSON(`${API}/api/refunds/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

/** Add internal note to a refund */
export async function addRefundNote(id, text) {
  return safeFetchJSON(`${API}/api/refunds/${encodeURIComponent(id)}/note`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/* ------------------------------- Users API ------------------------------- */

export async function getAdminUsers() {
  return safeFetchJSON(`${API}/api/admin/users`, { method: "GET" });
}

export async function setUserRole(userId, role) {
  return safeFetchJSON(`${API}/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function suspendUser(userId) {
  return safeFetchJSON(`${API}/api/admin/users/${encodeURIComponent(userId)}/suspend`, {
    method: "POST",
  });
}

export async function unsuspendUser(userId) {
  return safeFetchJSON(`${API}/api/admin/users/${encodeURIComponent(userId)}/unsuspend`, {
    method: "POST",
  });
}

export async function verifyUserApi(userId) {
  // named verifyUserApi to avoid clashing with any local verifyUser variables
  return safeFetchJSON(`${API}/api/admin/users/${encodeURIComponent(userId)}/verify`, {
    method: "POST",
  });
}

/* ------------------------------ Tutors API ------------------------------ */

export async function getAdminTutors() {
  return safeFetchJSON(`${API}/api/admin/tutors`, { method: "GET" });
}

export async function approveTutor(id) {
  return safeFetchJSON(`${API}/api/admin/tutors/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function suspendTutor(id) {
  return safeFetchJSON(`${API}/api/admin/tutors/${encodeURIComponent(id)}/suspend`, { method: "POST" });
}

export async function unsuspendTutor(id) {
  return safeFetchJSON(`${API}/api/admin/tutors/${encodeURIComponent(id)}/unsuspend`, { method: "POST" });
}

export async function verifyTutor(id) {
  return safeFetchJSON(`${API}/api/admin/tutors/${encodeURIComponent(id)}/verify`, { method: "POST" });
}

export async function setTutorFeatured(id, featured = true) {
  return safeFetchJSON(`${API}/api/admin/tutors/${encodeURIComponent(id)}/featured`, {
    method: "PATCH",
    body: JSON.stringify({ featured }),
  });
}

export async function setTutorRate(id, rate, currency) {
  return safeFetchJSON(`${API}/api/admin/tutors/${encodeURIComponent(id)}/rate`, {
    method: "PATCH",
    body: JSON.stringify({ rate: Number(rate), currency }),
  });
}

/* ------------------------------ Finance API ------------------------------ */

export async function getPayouts() {
  return safeFetchJSON(`${API}/api/payouts`, { method: "GET" });
}

export async function getRefunds() {
  return safeFetchJSON(`${API}/api/refunds`, { method: "GET" });
}

export async function approvePayout(payoutId) {
  return safeFetchJSON(`${API}/api/payouts/${encodeURIComponent(payoutId)}/approve`, { method: "POST" });
}

export async function financeSummary() {
  return safeFetchJSON(`${API}/api/finance/summary`, { method: "GET" });
}

/* -------------------------------- Utilities ------------------------------ */

export function formatMoney(value, digits = 2) {
  const n = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(digits) : "0.00";
}

export function ymd(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
