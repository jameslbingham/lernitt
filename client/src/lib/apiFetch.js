// /client/src/lib/apiFetch.js
import { handle as mockHandle } from "../mock/handlers.js";

/**
 * THE RECONNECTED BRIDGE
 * Priority 1: Render Dashboard setting (VITE_API_URL)
 * Priority 2: Local .env setting (VITE_API)
 * Priority 3: Hard-coded fallback for Lernitt Version 1
 */
const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API || "https://lernitt.onrender.com/api";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

export async function apiFetch(path, options = {}) {
  const { headers = {}, body, method = "GET", ...rest } = options;

  // Build the full URL
  const url = String(path).startsWith("http")
    ? String(path)
    : `${API}${String(path).startsWith("/") ? "" : "/"}${String(path)}`;

  // Prepare Security Headers
  const token = localStorage.getItem("token") || "";
  const finalHeaders = {
    ...headers,
    ...(body != null && typeof body !== "string" && { "Content-Type": "application/json" }),
    ...(token && { "Authorization": `Bearer ${token}` }),
  };

  // ---- MOCK MODE (For local testing) ----
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

  // ---- REAL NETWORK (Connecting to Render) ----
  const res = await fetch(url, {
    method,
    ...rest,
    headers: finalHeaders,
    body: body != null && typeof body !== "string" ? JSON.stringify(body) : body,
  });

  return handleResponse(res);
}

async function handleResponse(res) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP Error ${res.status}`);
  }
  return await res.json();
}
