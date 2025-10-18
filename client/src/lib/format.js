// client/src/lib/format.js
// -----------------------------------------------------------------------------
// Shared formatting + helper utilities for all Admin dashboard tabs
// Centralizes functions for consistent display, sorting, export + dates
// -----------------------------------------------------------------------------

/* ============================= NUMBER HELPERS ============================== */

/**
 * n — Safe number coercion.
 */
export function n(v) {
  const num = typeof v === "number" ? v : Number(v || 0);
  return Number.isFinite(num) ? num : 0;
}

/**
 * fmt — format to 2 decimal places.
 */
export function fmt(v) {
  const num = n(v);
  return num.toFixed(2);
}

/**
 * money — format as currency string with code.
 */
export function money(v, currency = "USD") {
  const num = n(v);
  return `${num.toFixed(2)} ${currency}`;
}

/* =============================== DATE HELPERS ============================== */

/**
 * pad — left pad with 0.
 */
export function pad(v) {
  return String(v).padStart(2, "0");
}

/**
 * fmtDate — readable timestamp (YYYY-MM-DD HH:mm)
 */
export function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * ymd — YYYY-MM-DD
 */
export function ymd(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * ym — YYYY-MM
 */
export function ym(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/**
 * withinPeriod — keep items within a time period
 * @param {string|Date} dateStr
 * @param {"today"|"week"|"month"|"all"} period
 */
export function withinPeriod(dateStr, period = "all") {
  if (period === "all") return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = (now.getDay() + 6) % 7; // Monday
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return d >= start && d <= now;
}

/* ============================== TEXT HELPERS =============================== */

/**
 * trunc — shorten long strings.
 */
export function trunc(str, len = 60) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

/**
 * capitalize — First letter upper-case
 */
export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * joinList — safely join array with commas
 */
export function joinList(arr, sep = ", ") {
  return Array.isArray(arr) ? arr.filter(Boolean).join(sep) : "";
}

/* =============================== SORT HELPERS ============================== */

/**
 * sortArray — generic comparator aware of date/number/string
 */
export function sortArray(arr, key, dir = "asc") {
  const sign = dir === "desc" ? -1 : 1;
  return [...arr].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    // date
    if (key.toLowerCase().includes("date") || key.toLowerCase().includes("at")) {
      return (new Date(va) - new Date(vb)) * sign;
    }
    // numeric
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * sign;
    }
    // fallback string
    return String(va).localeCompare(String(vb)) * sign;
  });
}

/* ============================== EXPORT HELPERS ============================= */

/**
 * exportCSV — Generate CSV and trigger download
 */
export function exportCSV(rows, filename = "export.csv") {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * exportXLSX — Generate XLSX file from array of objects
 */
export async function exportXLSX(rows, filename = "export.xlsx", sheet = "Sheet1") {
  if (!rows || !rows.length) return;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename);
}

/* ============================ SELECTION HELPERS ============================ */

/**
 * uniqueIds — make unique list of IDs
 */
export function uniqueIds(list) {
  return Array.from(new Set(list));
}

/**
 * paginate — slice array for given page and size
 */
export function paginate(arr, page = 1, size = 20) {
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
}

/* ================================ EXPORTS ================================= */

export default {
  n,
  fmt,
  money,
  pad,
  fmtDate,
  ymd,
  ym,
  withinPeriod,
  trunc,
  capitalize,
  joinList,
  sortArray,
  exportCSV,
  exportXLSX,
  uniqueIds,
  paginate,
};
