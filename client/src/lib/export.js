// /client/src/lib/export.js
// -----------------------------------------------------------------------------
// Central CSV/XLSX export helpers for admin tabs (mock + live safe).
// - Zero deps for CSV
// - Dynamic import for XLSX (code-splitting)
// - Handles BOM, delimiter/quote escaping, stable columns, auto column widths
// - Works with arrays of plain objects
// -----------------------------------------------------------------------------

/** Download a Blob as a file (browser-only). */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Collect stable columns from rows (union of keys, keeping first-seen order). */
function collectColumns(rows, explicitColumns) {
  if (Array.isArray(explicitColumns) && explicitColumns.length) return explicitColumns.slice();
  const cols = [];
  const seen = new Set();
  for (const r of rows || []) {
    if (!r || typeof r !== "object") continue;
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        cols.push(k);
      }
    }
  }
  return cols;
}

/** CSV-safe stringify for a single cell. */
function csvCell(value, delimiter = ",") {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (s.includes('"')) s = s.replace(/"/g, '""');
  if (s.includes(delimiter) || s.includes('"') || /\r|\n/.test(s)) {
    return `"${s}"`;
  }
  return s;
}

/**
 * Build CSV text from rows.
 */
function buildCSV(rows, options = {}) {
  const {
    columns,
    delimiter = ",",
    includeHeader = true,
  } = options;

  if (!rows || !rows.length) return { csv: "", columns: [] };

  const cols = collectColumns(rows, columns);
  const head = includeHeader ? cols.map((c) => csvCell(c, delimiter)).join(delimiter) : null;
  const body = rows.map((r) => cols.map((c) => csvCell(r?.[c], delimiter)).join(delimiter)).join("\n");
  const csv = includeHeader ? `${head}\n${body}` : body;

  return { csv, columns: cols };
}

/**
 * Export rows to CSV and trigger download.
 */
export function exportCSV(rows, filename = "export.csv", options = {}) {
  if (!rows || !rows.length) return;
  const { delimiter = ",", bom = true, columns, includeHeader = true } = options;
  const { csv } = buildCSV(rows, { delimiter, columns, includeHeader });

  const prefix = bom ? "\uFEFF" : "";
  const blob = new Blob([prefix + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/** Fit column widths (approx) based on cell string lengths. */
function autoFitColumnWidths(rows, columns) {
  const widths = columns.map((c) => Math.max(8, String(c).length + 2));
  for (const r of rows || []) {
    columns.forEach((c, i) => {
      const v = r?.[c];
      const len = v == null ? 0 : String(v).length;
      if (len + 2 > widths[i]) widths[i] = Math.min(len + 2, 60);
    });
  }
  return widths.map((wch) => ({ wch }));
}

/**
 * Export rows to a single-sheet XLSX file.
 */
export async function exportXLSXFromRows(
  rows,
  filename = "export.xlsx",
  sheetName = "Sheet1",
  options = {}
) {
  if (!rows || !rows.length) return;
  const { autoWidth = true, columns } = options;

  // FIXED: Use Vercel/Vite compatible ESM build
  const xlsxMod = await import("xlsx/build/xlsx.mjs");
  const XLSX = xlsxMod?.default || xlsxMod;

  const cols = collectColumns(rows, columns);
  const normalizedRows = rows.map((r) => {
    const o = {};
    cols.forEach((c) => {
      const v = r?.[c];
      if (typeof v === "number") o[c] = v;
      else if (v === null || v === undefined) o[c] = "";
      else if (!Number.isNaN(v) && v !== "" && typeof v !== "object" && v !== true && v !== false) {
        const asNum = Number(v);
        o[c] = String(v).match(/^0\d+/) ? String(v) : Number.isFinite(asNum) ? asNum : String(v);
      } else {
        o[c] = typeof v === "object" ? JSON.stringify(v) : String(v);
      }
    });
    return o;
  });

  const sheet = XLSX.utils.json_to_sheet(normalizedRows, { header: cols });

  if (autoWidth) {
    sheet["!cols"] = autoFitColumnWidths(normalizedRows, cols);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, String(sheetName || "Sheet1").slice(0, 31));
  XLSX.writeFile(wb, filename);
}

/**
 * Export multiple named sheets: { SheetName: rows[], ... }
 */
export async function exportXLSXFromTables(tables, filename = "export.xlsx", options = {}) {
  const names = Object.keys(tables || {});
  if (!names.length) return;

  // FIXED: Use Vercel/Vite compatible ESM build
  const xlsxMod = await import("xlsx/build/xlsx.mjs");
  const XLSX = xlsxMod?.default || xlsxMod;

  const wb = XLSX.utils.book_new();

  for (const name of names) {
    const rows = tables[name] || [];
    if (!rows.length) continue;

    const cols = collectColumns(rows);
    const normalized = rows.map((r) => {
      const o = {};
      cols.forEach((c) => {
        const v = r?.[c];
        if (typeof v === "number") o[c] = v;
        else if (v === null || v === undefined) o[c] = "";
        else if (!Number.isNaN(v) && v !== "" && typeof v !== "object" && v !== true && v !== false) {
          const asNum = Number(v);
          o[c] = String(v).match(/^0\d+/) ? String(v) : Number.isFinite(asNum) ? asNum : String(v);
        } else {
          o[c] = typeof v === "object" ? JSON.stringify(v) : String(v);
        }
      });
      return o;
    });

    const sheet = XLSX.utils.json_to_sheet(normalized, { header: cols });
    if (options.autoWidth !== false) {
      sheet["!cols"] = autoFitColumnWidths(normalized, cols);
    }
    XLSX.utils.book_append_sheet(wb, sheet, String(name || "Sheet").slice(0, 31));
  }

  XLSX.writeFile(wb, filename);
}

// Convenience re-exports
export default {
  exportCSV,
  exportXLSXFromRows,
  exportXLSXFromTables,
};
