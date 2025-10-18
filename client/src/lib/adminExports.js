// client/src/lib/adminExports.js
// -----------------------------------------------------------------------------
// Shared CSV/XLSX export helpers for all Admin Tabs (fixed imports)
// -----------------------------------------------------------------------------

import { exportCSV, exportXLSXFromRows } from "./export.js";

export function exportTableToCSV(rows, filename = "export.csv") {
  if (!Array.isArray(rows) || rows.length === 0) return;
  return exportCSV(rows, filename);
}

export function exportTableToXLSX(rows, filename = "export.xlsx", sheet = "Sheet1") {
  if (!Array.isArray(rows) || rows.length === 0) return;
  return exportXLSXFromRows(rows, filename, sheet);
}

export function exportTableData(data, filenameBase = "export") {
  if (!Array.isArray(data) || data.length === 0) return;
  exportCSV(data, `${filenameBase}.csv`);
  exportXLSXFromRows(data, `${filenameBase}.xlsx`, "Sheet1");
}

export function exportFinanceSummary(finance, filename = "finance-summary") {
  if (!finance?.byCurrency) return;
  const rows = finance.byCurrency.map((c) => ({
    Currency: c.currency,
    "GMV (€/$)": (c.gmvCents / 100).toFixed(2),
    "Platform Fee": (c.platformFeeCents / 100).toFixed(2),
    "Tutor Net": (c.tutorNetCents / 100).toFixed(2),
  }));
  exportCSV(rows, `${filename}.csv`);
  exportXLSXFromRows(rows, `${filename}.xlsx`, "Summary");
}
