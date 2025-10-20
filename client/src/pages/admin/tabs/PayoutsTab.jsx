// client/src/pages/admin/tabs/PayoutsTab.jsx
// -----------------------------------------------------------------------------
// PayoutsTab (Full Feature, Mock-Safe, Consistent with RefundsTab)
// -----------------------------------------------------------------------------
// ✔ Safe fetch with JWT + robust VITE_MOCK=1 fallbacks
// ✔ Filters: search, status, currency, method, date range
// ✔ KPIs: counts + amounts (total/queued/paid/failed) + selected sum
// ✔ Sorting, selection, bulk actions, export (CSV/XLSX)
// ✔ Skeletons + RetryCard + ErrorBoundary + shared helpers
// ✔ Fully compatible with AdminTable passthrough
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import AdminTable from "./AdminTableShim.jsx";

import { useToast } from "@/components/ui/ToastProvider.jsx";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { safeFetch, safeFetchJSON, IS_MOCK } from "@/lib/safeFetch.js";
import { ErrorBoundary, RetryCard, SkeletonBlock, SkeletonTable } from "@/lib/uiHelpers";
import {
  exportTableToCSV,
  exportTableToXLSX,
  exportTableData,
} from "@/lib/adminExports.js";
import { getPayouts, markPayoutsPaid, retryFailedPayout } from "@/lib/mockData.js";
import { listPayouts } from "@/mock/payoutsStore.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";

/* -------------------------------------------------------------------------- */
/*                              Utility functions                             */
/* -------------------------------------------------------------------------- */

const toNum = (v) => (typeof v === "number" ? v : Number(v || 0));
const pad = (n) => String(n).padStart(2, "0");

const fmtDate = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s || "—";
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

// Normalize payout amounts (divide by 100 in mock mode)
const money = (v) => {
  const n = toNum(v);
  const adjusted = import.meta.env.VITE_MOCK === "1" ? n / 100 : n;
  return Number.isFinite(adjusted) ? adjusted.toFixed(2) : "0.00";
};

/* -------------------------------------------------------------------------- */
/*                           Component Definition                              */
/* -------------------------------------------------------------------------- */

export default function PayoutsTab({ rows = [], columns = [], ...rest }) {
  // Passthrough AdminTable
  const hasExternalData =
    Array.isArray(rows) && rows.length && Array.isArray(columns) && columns.length;
  if (hasExternalData) {
    return <AdminTable rows={rows} columns={columns} {...rest} />;
  }

  // Hooks
  const toast = useToast();
  const confirm = useConfirm();

  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [currency, setCurrency] = useState("");
  const [method, setMethod] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Sorting / pagination / selection
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState(null);

  // Auto-refresh tick (mock only)
  const [refreshTick, setRefreshTick] = useState(0);

/* -------------------------------------------------------------------------- */
/*                               Data Loading                                 */
/* -------------------------------------------------------------------------- */

  useEffect(() => {
    loadPayouts();
  }, []);

  // Auto-refresh every 5s (mock only)
  useEffect(() => {
    if (import.meta.env.VITE_MOCK !== "1") return;
    const id = setInterval(() => setRefreshTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Reload on tick (mock only)
  useEffect(() => {
    if (import.meta.env.VITE_MOCK === "1") loadPayouts();
  }, [refreshTick]);

  // Load payouts with mock fallback (unified store)
  async function loadPayouts() {
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetch(`${API}/api/payouts`);
      const data = await res.json();
      const arr = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setItems(arr);
      if (import.meta.env.VITE_MOCK === "1") toast("Mock payouts refreshed", "info");
    } catch (err) {
      console.warn("Mock fallback → listPayouts()");
      try {
        setItems(listPayouts());
      } catch (e2) {
        console.error(e2);
        setError(err);
      }
      toast("Failed to load payouts (mock fallback used).", "warning");
    } finally {
      setLoading(false);
    }
  }
/* -------------------------------------------------------------------------- */
/*                                   Actions                                  */
/* -------------------------------------------------------------------------- */
  async function bulkMarkPaid() {
    if (!selected.length) return;
    const ok = await confirm({
      title: "Mark Paid",
      message: `Mark ${selected.length} payout(s) as paid?`,
      confirmText: "Mark Paid",
      tone: "success",
    });
    if (!ok) return;
    try {
      if (IS_MOCK) {
        setItems(markPayoutsPaid(selected));
      } else {
        await safeFetchJSON(`${API}/api/payouts/bulk/mark-paid`, {
          method: "POST",
          body: JSON.stringify({ ids: selected }),
        });
        await loadPayouts();
      }
      setSelected([]);
      toast("Bulk mark-paid completed.", "success");
    } catch (e) {
      console.error(e);
      toast("Bulk mark-paid failed.", "error");
    }
  }

  async function markPaid(id) {
    const ok = await confirm({
      title: "Mark Paid",
      message: `Mark payout #${id} as paid?`,
      confirmText: "Mark Paid",
      tone: "success",
    });
    if (!ok) return;
    try {
      if (IS_MOCK) {
        setItems(markPayoutsPaid([id]));
      } else {
        await safeFetchJSON(`${API}/api/payouts/${id}/mark-paid`, { method: "POST" });
        await loadPayouts();
      }
      toast(`Payout #${id} marked as paid.`, "success");
    } catch (e) {
      console.error(e);
      toast(`Failed to mark payout #${id}.`, "error");
    }
  }

  async function retryPayout(id) {
    try {
      if (import.meta.env.VITE_MOCK === "1") {
        setItems(retryFailedPayout(id));
        toast("Retry simulated (mock)", "info");
      } else {
        await safeFetch(`${API}/api/payouts/${id}/retry`, { method: "POST" });
        toast(`Retry requested for payout #${id}.`, "info");
        await loadPayouts();
      }
    } catch (e) {
      console.error(e);
      toast(`Retry failed for payout #${id}.`, "error");
    }
  }

  // one-row mark paid (re-uses existing markPaid)
  const markOnePaid = (id) => {
    if (!id) return;
    markPaid(id);
  };

/* -------------------------------------------------------------------------- */
/*                           Filters / Sorting Logic                           */
/* -------------------------------------------------------------------------- */
  const filtered = useMemo(() => {
    let arr = items;
    const qq = q.trim().toLowerCase();
    if (qq) arr = arr.filter((r) => JSON.stringify(r).toLowerCase().includes(qq));
    if (status) arr = arr.filter((r) => (r.status || "") === status);
    if (currency) arr = arr.filter((r) => (r.currency || "") === currency);
    if (method) arr = arr.filter((r) => (r.method || "") === method);
    if (fromDate) {
      const from = new Date(fromDate);
      arr = arr.filter((r) => new Date(r.createdAt) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      arr = arr.filter((r) => new Date(r.createdAt) <= to);
    }
    return arr;
  }, [items, q, status, currency, method, fromDate, toDate]);

  const sorted = useMemo(() => {
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (sort.key.endsWith("At") || sort.key.toLowerCase().includes("date")) {
        return (new Date(va).getTime() - new Date(vb).getTime()) * dir;
      }
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page]
  );

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages, filtered.length]);

/* -------------------------------------------------------------------------- */
/*                            Selection & Paging                               */
/* -------------------------------------------------------------------------- */
  function selectAllResults() {
    setSelected(Array.from(new Set(filtered.map((r) => r.id))));
  }
  function selectPage() {
    setSelected(Array.from(new Set(paged.map((r) => r.id))));
  }
  function clearSelection() {
    setSelected([]);
  }

/* -------------------------------------------------------------------------- */
/*                                  Exports                                    */
/* -------------------------------------------------------------------------- */
  function shapeRows(arr) {
    return arr.map((d) => ({
      ID: d.id,
      Tutor: d.tutor?.name ?? d.tutorName ?? "",
      Email: d.tutor?.email ?? "",
      Amount: Number(d.amount),
      Currency: d.currency ?? "",
      Status: d.status ?? "",
      Method: d.method ?? "",
      CreatedAt: d.createdAt ?? "",
      PaidAt: d.paidAt ?? "",
      Notes:
        typeof d.notes === "string"
          ? d.notes
          : Array.isArray(d.notes)
          ? d.notes.join("; ")
          : "",
    }));
  }

  function exportCSVFile() {
    if (!filtered.length) return toast("No data to export.", "warning");
    exportTableToCSV(shapeRows(filtered), "payouts.csv");
    toast("CSV exported.", "success");
  }

  async function exportXLSXFile() {
    if (!filtered.length) return toast("No data to export.", "warning");
    await exportTableToXLSX(shapeRows(filtered), "payouts.xlsx", "Payouts");
    toast("XLSX exported.", "success");
  }

  function exportUnified() {
    const data = sorted.map((d) => ({
      ID: d.id,
      Tutor: d.tutorName ?? d.tutor?.name ?? "",
      Method: d.method ?? "",
      Currency: d.currency ?? "",
      Amount: Number(d.amount) ?? 0,
      Status: d.status ?? "",
      Notes:
        typeof d.notes === "string"
          ? d.notes
          : Array.isArray(d.notes)
          ? d.notes.join("; ")
          : "",
      CreatedAt: d.createdAt ?? "",
      PaidAt: d.paidAt ?? "",
    }));
    if (!data.length) return toast("No rows to export.", "warning");
    exportTableData(data, "payouts");
    toast("CSV/XLSX exported.", "success");
  }

/* -------------------------------------------------------------------------- */
/*                                   KPIs                                      */
/* -------------------------------------------------------------------------- */
  const kpi = useMemo(() => {
    const total = filtered.length;
    const queued = filtered.filter((x) => x.status === "queued");
    const paid = filtered.filter((x) => x.status === "paid");
    const failed = filtered.filter((x) => x.status === "failed");
    const sum = (arr) => arr.reduce((s, r) => s + Number(r.amount || 0), 0);
    return {
      total,
      queuedCount: queued.length,
      paidCount: paid.length,
      failedCount: failed.length,
      totalAmount: sum(filtered),
      queuedAmount: sum(queued),
      paidAmount: sum(paid),
      failedAmount: sum(failed),
    };
  }, [filtered]);

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                     */
/* -------------------------------------------------------------------------- */
  function th(colKey, label) {
    return (
      <button
        onClick={() =>
          setSort((s) =>
            s.key === colKey
              ? { key: colKey, dir: s.dir === "asc" ? "desc" : "asc" }
              : { key: colKey, dir: "asc" }
          )
        }
        style={{ all: "unset", cursor: "pointer" }}
        title={`Sort by ${label || colKey}`}
        aria-label={`Sort by ${label || colKey}`}
      >
        {label || colKey}
        {sort.key === colKey ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    );
  }

  function StatusBadge({ s }) {
    const base = "px-2 py-0.5 rounded-full border text-xs";
    if (s === "paid")
      return <span className={`${base} bg-green-50 border-green-200 text-green-800`}>paid</span>;
    if (s === "failed")
      return <span className={`${base} bg-red-50 border-red-200 text-red-800`}>failed</span>;
    if (s === "queued")
      return <span className={`${base} bg-yellow-50 border-yellow-200 text-yellow-800`}>queued</span>;
    if (s === "cancelled")
      return <span className={`${base} bg-gray-50 border-gray-200 text-gray-800`}>cancelled</span>;
    return <span className={`${base} bg-blue-50 border-blue-200 text-blue-800`}>{s || "pending"}</span>;
  }
/* -------------------------------------------------------------------------- */
/*                               Render Layout                                 */
/* -------------------------------------------------------------------------- */
  return (
    <ErrorBoundary>
      <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white border rounded-2xl p-3 text-center">
              <div className="font-semibold">Total</div>
              <div>{kpi.total}</div>
              <div className="text-xs text-gray-500 mt-1">
                ${Number(kpi.totalAmount).toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-3 text-center">
              <div className="font-semibold">Queued</div>
              <div>{kpi.queuedCount}</div>
              <div className="text-xs text-yellow-700 mt-1">
                ${Number(kpi.queuedAmount).toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-3 text-center">
              <div className="font-semibold">Paid</div>
              <div>{kpi.paidCount}</div>
              <div className="text-xs text-green-700 mt-1">
                ${Number(kpi.paidAmount).toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-3 text-center">
              <div className="font-semibold">Failed</div>
              <div>{kpi.failedCount}</div>
              <div className="text-xs text-red-700 mt-1">
                ${Number(kpi.failedAmount).toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-3 text-center">
              <div className="font-semibold">Selected</div>
              <div>{selected.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                $
                {Number(
                  (Array.isArray(sorted) ? sorted : [])
                    .filter((x) => selected.includes(x.id))
                    .reduce((s, r) => s + Number(r.amount || 0), 0)
                ).toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-3 text-center">
              <div className="font-semibold">Currencies</div>
              <div>
                {Array.from(new Set(filtered.map((x) => x.currency).filter(Boolean))).join(", ") ||
                  "—"}
              </div>
            </div>
          </div>
        )}

        {/* Auto-refresh cue (mock) */}
        {import.meta.env.VITE_MOCK === "1" && (
          <div className="text-xs text-muted-foreground mb-2">
            Auto-refresh active (5 s interval)
          </div>
        )}

        {/* Filters + Actions + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Filters + Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-semibold mb-2">Filters</h3>

              <input
                className="border rounded px-2 py-1 w-full mb-2"
                placeholder="Search…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                aria-label="Search payouts"
              />

              <select
                className="border rounded px-2 py-1 w-full mb-2"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="">All status</option>
                <option value="queued">queued</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>

              <select
                className="border rounded px-2 py-1 w-full mb-2"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by currency"
              >
                <option value="">All currencies</option>
                {Array.from(new Set(items.map((d) => d.currency)))
                  .filter(Boolean)
                  .sort()
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>

              <select
                className="border rounded px-2 py-1 w-full mb-2"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by method"
              >
                <option value="">All methods</option>
                {Array.from(new Set(items.map((d) => d.method)))
                  .filter(Boolean)
                  .sort()
                  .map((m) => (
                    <option key={m}>{m}</option>
                  ))}
              </select>

              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  className="border rounded px-2 py-1 flex-1"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  aria-label="From date"
                />
                <input
                  type="date"
                  className="border rounded px-2 py-1 flex-1"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  aria-label="To date"
                />
              </div>

              {/* Bulk actions */}
              <div className="flex gap-2 mt-3">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={bulkMarkPaid}
                  disabled={!selected.length}
                >
                  Bulk Mark Paid
                </button>
              </div>

              {/* Selection helpers */}
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                <button className="px-3 py-1 border rounded" onClick={selectPage}>
                  Select page
                </button>
                <button className="px-3 py-1 border rounded" onClick={selectAllResults}>
                  Select all results
                </button>
                <button className="px-3 py-1 border rounded" onClick={clearSelection}>
                  Clear selection
                </button>
                <span className="text-sm text-gray-600 ml-2">
                  Selected {selected.length} / {filtered.length}
                </span>
              </div>

              {/* Export buttons (CSV + XLSX + Auto) */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="px-3 py-1 border rounded" onClick={exportCSVFile}>
                  Export CSV
                </button>
                <button className="px-3 py-1 border rounded" onClick={exportXLSXFile}>
                  Export XLSX
                </button>
                <button className="px-3 py-1 border rounded" onClick={exportUnified}>
                  Smart Export
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="lg:col-span-2">
            <div className="overflow-auto border rounded-2xl">
              {error ? (
                <RetryCard onRetry={loadPayouts} message="Failed to load payouts." />
              ) : loading ? (
                <SkeletonTable rows={6} cols={10} />
              ) : paged.length === 0 ? (
                <div className="p-6">
                  <SkeletonBlock height={80} />
                  <p className="text-gray-600 mt-2 text-center">
                    No payouts found for these filters.
                  </p>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border-b">
                        <input
                          type="checkbox"
                          checked={
                            paged.length > 0 &&
                            selected.length > 0 &&
                            paged.every((r) => selected.includes(r.id))
                          }
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? Array.from(new Set([...selected, ...paged.map((r) => r.id)]))
                                : selected.filter((id) => !paged.some((r) => r.id === id))
                            )
                          }
                          aria-label="Select all on page"
                        />
                      </th>
                      <th className="px-3 py-2 border-b text-left">{th("id", "ID")}</th>
                      <th className="px-3 py-2 border-b text-left">Tutor</th>
                      <th className="px-3 py-2 border-b text-left">{th("method", "Method")}</th>
                      <th className="px-3 py-2 border-b text-right">{th("amount", "Amount")}</th>
                      <th className="px-3 py-2 border-b text-left">{th("currency", "Currency")}</th>
                      <th className="px-3 py-2 border-b text-left">{th("status", "Status")}</th>
                      <th className="px-3 py-2 border-b text-left">{th("createdAt", "Created")}</th>
                      <th className="px-3 py-2 border-b text-left">{th("paidAt", "Paid")}</th>
                      <th className="px-3 py-2 border-b text-left">Notes</th>
                      <th className="px-3 py-2 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((d) => (
                      <React.Fragment key={d.id}>
                        <tr className="border-t align-top">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.includes(d.id)}
                              onChange={(e) =>
                                setSelected((s) =>
                                  e.target.checked
                                    ? [...new Set([...s, d.id])]
                                    : s.filter((x) => x !== d.id)
                                )
                              }
                              aria-label={`Select payout ${d.id}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">#{d.id}</td>
                          <td className="px-3 py-2">
                            {d.tutor?.name ?? d.tutorName ?? "—"}
                            {d.tutor?.email ? (
                              <span className="text-xs text-gray-500"> ({d.tutor.email})</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            {d.method || "—"}
                            {d.method === "paypal" && d.paypalEmail ? (
                              <span className="text-xs text-gray-500"> ({d.paypalEmail})</span>
                            ) : null}
                            {d.method === "bank" && d.bankAccountLast4 ? (
                              <span className="text-xs text-gray-500"> (•••• {d.bankAccountLast4})</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {money(d.amount)} <span className="text-xs">{d.currency || "USD"}</span>
                          </td>
                          <td className="px-3 py-2">{d.currency || "—"}</td>
                          <td className="px-3 py-2">
                            <StatusBadge s={d.status} />
                            {d.failureReason && d.status === "failed" ? (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-800">
                                {d.failureReason}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-xs">{fmtDate(d.createdAt)}</td>
                          <td className="px-3 py-2 text-xs">{d.paidAt ? fmtDate(d.paidAt) : "—"}</td>
                          <td className="px-3 py-2 max-w-[260px]">
                            <div className="truncate" title={typeof d.notes === "string" ? d.notes : ""}>
                              {typeof d.notes === "string"
                                ? d.notes || "—"
                                : Array.isArray(d.notes)
                                ? d.notes.join("; ")
                                : "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="px-2 py-1 border rounded"
                                onClick={() => markPaid(d.id)}
                                disabled={(d.status || "") === "paid"}
                              >
                                Mark Paid
                              </button>
                              {d.status === "failed" && (
                                <button
                                  className="px-2 py-1 border rounded"
                                  onClick={() => retryPayout(d.id)}
                                >
                                  Retry
                                </button>
                              )}
                              <button
                                className="px-2 py-1 border rounded"
                                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                              >
                                {expanded === d.id ? "Hide" : "Details"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded === d.id && (
                          <tr className="border-t bg-gray-50/40">
                            <td className="px-3 py-2" colSpan={11}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
                                <div className="space-y-1">
                                  <div><b>Payout ID:</b> {d.id}</div>
                                  <div><b>Tutor:</b> {d.tutor?.name ?? d.tutorName ?? "—"} {d.tutor?.email ? `(${d.tutor.email})` : ""}</div>
                                  <div><b>Method:</b> {d.method || "—"}</div>
                                  <div><b>Amount:</b> {money(d.amount)} {d.currency || ""}</div>
                                  <div><b>Status:</b> {d.status}</div>
                                  <div><b>Created:</b> {fmtDate(d.createdAt)}</div>
                                  <div><b>Paid:</b> {d.paidAt ? fmtDate(d.paidAt) : "—"}</div>
                                  {d.failureReason && <div><b>Failure:</b> {d.failureReason}</div>}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold mb-1">Notes</div>
                                  {typeof d.notes === "string" && d.notes ? (
                                    <div className="border rounded-lg px-2 py-1">{d.notes}</div>
                                  ) : Array.isArray(d.notes) && d.notes.length ? (
                                    <ul className="space-y-1">
                                      {d.notes.map((n, i) => (
                                        <li key={i} className="border rounded-lg px-2 py-1">{n}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-xs text-gray-500">No notes.</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {sorted.length > 0 && (
              <div className="flex items-center gap-3 mt-3">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span>Page {page} / {totalPages}</span>
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            )}

            {/* Footer Summaries */}
            <div className="mt-4 p-3 bg-gray-50 border rounded-xl text-sm">
              <b>Total Amount (filtered):</b> ${Number(kpi.totalAmount).toFixed(2)}
              <br />
              <b>By Currency:</b>{" "}
              {Object.entries(
                filtered.reduce((acc, x) => {
                  const c = x.currency || "USD";
                  acc[c] = (acc[c] || 0) + Number(x.amount || 0);
                  return acc;
                }, {})
              )
                .map(([c, v]) => `${c}: ${Number(v).toFixed(2)}`)
                .join(", ") || "—"}
            </div>

            <div className="mt-2 text-xs text-gray-400 text-center">
              Showing {paged.length} of {filtered.length} payouts (page {page}/{totalPages})
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
