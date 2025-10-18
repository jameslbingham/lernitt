import React from "react";
import { cx } from "../utils/misc.js";
import { formatCell } from "../utils/format.js";

/**
 * AdminTable – small, dependency-free table engine.
 * Props:
 * - rows: array of objects (already filtered/paged)
 * - columns: [{ key, label, render? }]
 * - selected: array<number> indexes (relative to rows prop)
 * - onSelectedChange(indexes)
 * - sort: { key, dir: 'asc'|'desc' }
 * - onSortChange({key,dir})
 * - actionsRender(row)
 * - emptyText
 */
export default function AdminTable({
  rows = [],
  columns = [],
  selected = [],
  onSelectedChange = () => {},
  sort = { key: null, dir: "asc" },
  onSortChange = () => {},
  actionsRender,
  emptyText = "No items found.",
}) {
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="overflow-auto border rounded-2xl">
      {rows.length === 0 ? (
        <div className="p-6 text-gray-600">{emptyText}</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  onChange={(e) =>
                    onSelectedChange(e.target.checked ? rows.map((_, i) => i) : [])
                  }
                />
              </th>
              {columns.map((c) => (
                <th key={c.key} className="text-left px-3 py-2 border-b">
                  <button
                    onClick={() =>
                      onSortChange(
                        sort.key === c.key
                          ? { key: c.key, dir: sort.dir === "asc" ? "desc" : "asc" }
                          : { key: c.key, dir: "asc" }
                      )
                    }
                    style={{ all: "unset", cursor: "pointer" }}
                    title={`Sort by ${c.label || c.key}`}
                    aria-label={`Sort by ${c.label || c.key}`}
                  >
                    {c.label || c.key}
                    {sort.key === c.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
              {actionsRender && <th className="text-left px-3 py-2 border-b">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const checked = selected.includes(i);
              return (
                <tr key={row.id ?? i} className={cx("odd:bg-white even:bg-gray-50 align-top")}>
                  <td className="px-3 py-2 border-b">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${i + 1}`}
                      checked={checked}
                      onChange={(e) =>
                        onSelectedChange(
                          e.target.checked
                            ? [...selected, i]
                            : selected.filter((x) => x !== i)
                        )
                      }
                    />
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 border-b">
                      {c.render ? c.render(row) : formatCell(get(row, c.key))}
                    </td>
                  ))}
                  {actionsRender && (
                    <td className="px-3 py-2 border-b">{actionsRender(row, i)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// tiny safe-get (supports dot paths)
function get(obj, path) {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}
