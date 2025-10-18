export const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export function flatten(obj, prefix = "", out = {}) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object") {
    out[prefix || "value"] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out);
    else out[p] = v;
  }
  return out;
}

export function formatDate(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function formatCell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    if (ISO_RE.test(v)) return formatDate(v);
    return v.length > 120 ? v.slice(0, 117) + "…" : v;
  }
  if (Array.isArray(v)) return v.length > 5 ? `Array(${v.length})` : JSON.stringify(v);
  return JSON.stringify(v);
}
