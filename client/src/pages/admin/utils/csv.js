import { flatten } from "./format.js";

export function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const flatRows = rows.map((r) => flatten(r));
  const headers = Object.keys(flatRows[0]);
  return [
    headers.join(","),
    ...flatRows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
}

export function exportToCSV(rows, filename) {
  if (!rows || !rows.length) return;
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  a.click();
  URL.revokeObjectURL(url);
}
