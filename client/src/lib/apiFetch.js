// /client/src/lib/apiFetch.js
import { handle as mockHandle } from "../mock/handlers.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/**
 * apiFetch(pathOrUrl, { method, body, headers })
 * - Auto-prefixes VITE_API when given a relative path.
 * - Always includes Authorization when token exists.
 * - Sends JSON body when "body" is provided.
 * - Returns parsed JSON or throws Error(message).
 * - Handles global 401: clears auth + redirects to login.
 * - In mock mode, routes to mock handlers.
 */
export async function apiFetch(path, options = {}) {
  const { headers = {}, body, method = "GET", ...rest } = options;

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
      body:
        body != null && typeof body !== "string"
          ? JSON.stringify(body)
          : body,
      ...rest,
    };

    const res = await mockHandle(url, mockOptions);
    return handleResponse(res);
  }

  // ---- REAL NETWORK --------------------------------------------------------
  const res = await fetch(url, {
    method,
    ...rest,
    headers: pruneUndefined(finalHeaders),
    body:
      body != null && typeof body !== "string"
        ? JSON.stringify(body)
        : body,
  });

  return handleResponse(res);
}

// ---- Shared response handler -----------------------------------------------
async function handleResponse(res) {
  if (!res || typeof res.ok !== "boolean") throw new Error("Invalid response");

  // 401 → signal auth error + logout + redirect
  if (res.status === 401) {
    let code = "UNAUTHORIZED";
    let message = "Unauthorized";

    try {
      const ct = res.headers?.get?.("content-type") || "";
      if (ct.includes("application/json") && res.json) {
        const data = await res.json();
        if (data && typeof data === "object") {
          message = data.message || data.error || message;
          if (typeof data.code === "string") {
            code = data.code;
          }
        }
      }
    } catch {
      // swallow parsing errors; fall back to defaults
    }

    const error = Object.assign(new Error(message), {
      status: 401,
      code,
      authError: { status: 401, code, message },
    });

    // Global auth-error signal (for Header / useAuth to listen to)
    try {
      document.dispatchEvent(
        new CustomEvent("auth-error", { detail: error.authError })
      );
    } catch {
      // ignore if document/CustomEvent not available
    }

    handleUnauthorizedRedirect();
    throw error;
  }

  let data = null;
  const ct = res.headers?.get("content-type") || "";

  if (ct.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    // supports mock responses that are plain objects (no .text())
    data = (await res.text?.()) || res;
  }

  // JSON error object (even if 200 OK)
  if (data && typeof data === "object" && data.error) {
    throw Object.assign(new Error(data.error), { status: res.status });
  }

  // HTTP error code
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

// ✅ FIX: read token from combined "auth" key first, then fallback
function safeGetToken() {
  try {
    const raw = localStorage.getItem("auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.token === "string") {
        return parsed.token;
      }
    }
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

// ✅ FIX: clear *all* auth storage, including combined key
function handleUnauthorizedRedirect() {
  try {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {}
  try {
    document.dispatchEvent(new Event("auth-change"));
  } catch {}
  const next = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  window.location.replace(`/login?next=${next}`);
}
