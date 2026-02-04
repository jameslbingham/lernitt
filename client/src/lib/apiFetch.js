// /client/src/lib/apiFetch.js
import { handle as mockHandle } from "../mock/handlers.js";

/* --- THE FIRST PRINCIPLES MERGE: HARDCODED TO STOP THE LOOPS --- */
// We remove 'import.meta.env.VITE_API' to stop Render from guessing the wrong address.
const API = "https://lernitt-server.onrender.com/api"; 
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/**
 * apiFetch(pathOrUrl, { method, body, headers })
 */
export async function apiFetch(path, options = {}) {
  const { headers = {}, body, method = "GET", ...rest } = options;

  // This logic now uses the hardcoded 'https://lernitt-server.onrender.com/api'
  const url = String(path).startsWith("http")
    ? String(path)
    : `${API}${String(path).startsWith("/") ? "" : "/"}${String(path)}`;

  // Build headers
  const token = safeGetToken();
  const finalHeaders = {
    ...headers,
    ...(body != null && typeof body !== "string" && {
      "Content-Type": "application/json",
    }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // ---- MOCK MODE -----------------------------------------------------------
  if (IS_MOCK) {
    const mockOptions = {
      method,
      headers: finalHeaders,
      body: body != null && typeof body !== "string" ? JSON.stringify(body) : body,
      ...rest,
    };
    const res = await mockHandle(url, mockOptions);
    return handleResponse(res);
  }

  // ---- REAL NETWORK (The part that was failing) ----------------------------
  const res = await fetch(url, {
    method,
    ...rest,
    headers: pruneUndefined(finalHeaders),
    body: body != null && typeof body !== "string" ? JSON.stringify(body) : body,
  });

  return handleResponse(res);
}

// ---- Shared response handler (All your original logic preserved) -----------
async function handleResponse(res) {
  if (!res || typeof res.ok !== "boolean") throw new Error("Invalid response");

  if (res.status === 401) {
    let data = null;
    try {
      const ct = res.headers?.get?.("content-type") || "";
      if (ct.includes("application/json") && res.json) {
        data = await res.json();
      }
    } catch { data = null; }

    try {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
    } catch { /* ignore */ }

    const msg = (data && (data.error || data.message)) || "Session expired.";
    throw new Error(msg);
  }

  let data = null;
  const ct = res.headers?.get("content-type") || "";

  if (ct.includes("application/json")) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    data = (await res.text?.()) || res;
  }

  if (data && typeof data === "object" && data.error) {
    throw Object.assign(new Error(data.error), { status: res.status });
  }

  if (!res.ok) {
    throw Object.assign(
      new Error(data?.message || data?.error || `HTTP ${res.status}`),
      { status: res.status }
    );
  }

  return data;
}

// ---- helpers ---------------------------------------------------------------
function pruneUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
}

function safeGetToken() {
  try {
    const raw = localStorage.getItem("auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token;
    }
    return localStorage.getItem("token") || "";
  } catch { return ""; }
}

function handleUnauthorizedRedirect() {
  try {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {}
  try {
    document.dispatchEvent(new Event("auth-change"));
  } catch {}
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
}
