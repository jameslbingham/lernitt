// /client/src/lib/http.js
import * as handlers from "../mock/handlers.js";

export async function apiFetch(url, options = {}) {
  // If mock mode is on
  if (import.meta.env.VITE_MOCK === "1") {
    const res = await handlers.handle(url, options);
    return res;
  }

  // Otherwise, fall back to real fetch
  return fetch(url, options);
}
