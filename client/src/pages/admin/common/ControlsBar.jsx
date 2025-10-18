import React from "react";
import { Btn } from "./Buttons.jsx";
import { Input, Select } from "./Inputs.jsx";
import Collapsible from "./Collapsible.jsx";

/**
 * ControlsBar – search, filters, columns, page size, export.
 * Slots:
 * - leftExtras / rightExtras: React nodes
 * - columnsList: string[] (all columns)
 * - visibleCols: string[]
 * - onVisibleColsChange(cols[])
 */
export default function ControlsBar({
  tab,
  query, onQueryChange,
  onClear,
  onExportCSV,
  filterNode,
  pageSize, onPageSizeChange,
  columnsList = [], visibleCols = [], onVisibleColsChange = () => {},
  leftExtras, rightExtras,
  activeStatus // optional JSX for "Active: search/filter/sort"
}) {
  const toggleCol = (name, nextOn) => {
    const set = new Set(visibleCols?.length ? visibleCols : columnsList.slice(0, 8));
    nextOn ? set.add(name) : set.delete(name);
    onVisibleColsChange(Array.from(set));
  };

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur mb-3 border rounded-2xl p-2">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="flex items-center gap-2">
          <Input
            className="w-[22rem]"
            placeholder={`Search in ${tab}…`}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label={`Search in ${tab}`}
          />
          <Btn onClick={onClear} title="Clear filters">Clear</Btn>
          <Btn onClick={onExportCSV} title="Export current view to CSV">Export CSV</Btn>
          {leftExtras}
        </div>

        <div className="flex items-center gap-2">
          {filterNode}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value || "25", 10))}
            title="Rows per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}/page</option>
            ))}
          </Select>

          <Collapsible title="Columns" startOpen={false}>
            {columnsList.length === 0 ? (
              <div className="text-sm text-gray-600">No columns.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {columnsList.map((c) => {
                  const on = visibleCols.length ? visibleCols.includes(c) : columnsList.slice(0,8).includes(c);
                  return (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => toggleCol(c, e.target.checked)}
                      />
                      <span>{c}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Collapsible>
          {rightExtras}
        </div>
      </div>

      {activeStatus}
    </div>
  );
}
