export function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function debounce(fn, ms = 250) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function deepEqual(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

export function pretty(v) {
  try { return typeof v === "string" ? v : JSON.stringify(v, null, 2); }
  catch { return String(v); }
}

export function currencyFormat(value, currency = "USD", locale = "en-US") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

export async function safeFetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

export function downloadJSON(obj, filename = "export.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr || []) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

export function sumBy(arr, sel = (x) => x) {
  let s = 0;
  for (const x of arr || []) s += Number(sel(x) || 0);
  return s;
}
