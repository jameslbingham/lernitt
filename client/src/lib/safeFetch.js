// client/src/lib/safeFetch.js
export const API = import.meta.env.VITE_API || "http://localhost:5000";
export const IS_MOCK = import.meta.env.VITE_MOCK === "1";

export async function safeFetch(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  try {
    return await fetch(url, { ...opts, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 599,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function safeFetchJSON(url, opts = {}) {
  const res = await safeFetch(url, opts);
  try {
    return await res.json();
  } catch {
    return null;
  }
}
