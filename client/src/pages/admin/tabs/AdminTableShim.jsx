// client/src/pages/admin/tabs/AdminTableShim.jsx
// -----------------------------------------------------------------------------
// AdminTableShim — universal wrapper to ensure consistent table UI
// Used across admin tabs to provide:
// ✅ Standardized loading + empty states
// ✅ Consistent border/rounded styling
// ✅ Graceful fallback if AdminTable.jsx is missing
// ✅ Future-proof hook point for virtualized tables
// -----------------------------------------------------------------------------

import React from "react";
import AdminTable from "../common/AdminTable.jsx";

// Skeleton for loading
function TableSkeleton({ rows = 6 }) {
  return (
    <table className="min-w-full text-sm">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-t">
            <td className="p-2">
              <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * AdminTableShim
 * @param {Object} props
 * @param {boolean} props.loading - whether the table is loading
 * @param {Array} props.rows - data rows
 * @param {JSX.Element[]} [props.columns] - columns or header cells
 * @param {string} [props.emptyText] - custom message for empty state
 * @param {boolean} [props.noBorder] - remove border if true
 */
export default function AdminTableShim({
  loading = false,
  rows = [],
  columns,
  emptyText = "No data found.",
  noBorder = false,
  ...rest
}) {
  if (loading) {
    return (
      <div className={`bg-white ${noBorder ? "" : "border"} rounded-2xl p-3`}>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div
        className={`bg-white ${noBorder ? "" : "border"} rounded-2xl p-6 text-center text-gray-600`}
      >
        {emptyText}
      </div>
    );
  }

  try {
    return (
      <div className={`bg-white ${noBorder ? "" : "border"} rounded-2xl overflow-auto`}>
        <AdminTable rows={rows} columns={columns} {...rest} />
      </div>
    );
  } catch (err) {
    console.error("AdminTableShim fallback:", err);
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
        <b>Table rendering failed:</b> {String(err.message || err)}
      </div>
    );
  }
}
