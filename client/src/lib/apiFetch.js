// /client/src/lib/apiFetch.js
import { handle as mockHandle } from "../mock/handlers.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/**
 * apiFetch(pathOrUrl, { method, body, headers, auth })
 * - Auto-prefixes VITE_API when given a relative path.
 * - Adds Authorization when auth: true (Bearer <token>).
 * - Sends JSON body when "body" is provided.
 * - Returns parsed data (JSON or text).
 * - Throws on non-2xx with Error(status, message).
 * - In mock mode (VITE_MOCK=1), routes to mock handlers with the same contract.
 * - NEW: Global 401 handling — clears auth and redirects to /login?next=<current>
 */
export async function apiFetch(path, options = {}) {
  const {
    auth = false,
    headers = {},
    body,
    method = "GET",
    ...rest
  } = options;

  // Build URL (relative -> prefixed with API)
  const url = String(path).startsWith("http")
    ? String(path)
    : `${API}${String(path).startsWith("/") ? "" : "/"}${String(path)}`;

  // Compose headers
  const finalHeaders = { ...headers };
  if (body != null && finalHeaders["Content-Type"] == null) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth && !finalHeaders.Authorization) {
    const token = safeGetToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  // --- MOCK MODE ------------------------------------------------------------
  if (IS_MOCK) {
    // mock handler accepts either stringified or object body; string is safest
    const mockOptions = {
      method,
      headers: finalHeaders,
      body: body != null && typeof body !== "string" ? JSON.stringify(body) : body,
      ...rest,
    };

    const res = await mockHandle(url, mockOptions);

    if (!res || typeof res.ok !== "boolean") {
      const err = new Error("Mock handler returned an invalid response");
      err.status = 500;
      throw err;
    }

    // NEW: global 401 in mock (just in case a mock route returns 401)
    if (!res.ok && res.status === 401) {
      handleUnauthorizedRedirect();
      const err401 = new Error("Unauthorized");
      err401.status = 401;
      throw err401;
    }

    if (!res.ok) {
      // Try to read JSON error message; fall back to generic
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data && data.error) message = data.error;
      } catch {}
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    // Success → return parsed JSON (mock returns JSON)
    try {
      return await res.json();
    } catch {
      return null; // if a mock route someday returns no body
    }
  }

  // --- REAL NETWORK ---------------------------------------------------------
  const fetchOptions = {
    method,
    ...rest,
    headers: pruneUndefined(finalHeaders),
    body: body != null && typeof body !== "string" ? JSON.stringify(body) : body,
  };

  const res = await fetch(url, fetchOptions);

  // NEW: global 401 for real backend
  if (res.status === 401) {
    handleUnauthorizedRedirect();
    const err401 = new Error("Unauthorized");
    err401.status = 401;
    throw err401;
  }

  if (!res.ok) {
    let message = "";
    try {
      // Try JSON first
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        message = data?.error || data?.message || "";
      } else {
        message = await res.text();
      }
    } catch {}
    const err = new Error(message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// --- helpers ----------------------------------------------------------------
function pruneUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
}
function safeGetToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}
function handleUnauthorizedRedirect() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {}
  try {
    document.dispatchEvent(new Event("auth-change"));
  } catch {}
  if (typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
  }
}
