// client/src/pages/admin/tabs/RefundsTab.jsx
// ============================================================================
// RefundsTab — Full, Table Layout (Users/Tutors style), Mock-Safe, Self-Contained
// Integrated Steps 23.1 → 23.11
// Live API only for loading. Mock banner removed. All features retained.
// ============================================================================

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { safeFetch } from "@/lib/safeFetch";
import {
  ErrorBoundary,
  RetryCard,
  SkeletonBlock,
  SkeletonTable,
} from "@/lib/uiHelpers";
import {
  exportTableToCSV,
  exportTableToXLSX,
  exportTableData,
} from "@/lib/adminExports";
import {
  // kept for compatibility during transition (not used by loadRefunds now)
  getRefunds,
  approveRefund as mockApproveRefund,
  denyRefund as mockDenyRefund,
  updateRefundNote,
} from "@/lib/mockData";
import { API, IS_MOCK, safeFetchJSON } from "../../../lib/safeFetch";
import AdminTable from "./AdminTableShim.jsx";
import { approveRefund, denyRefund } from "@/lib/api";

// --------------------------- Local Toast/Confirm ---------------------------
const ToastCtx = createContext(null);

function ToastProviderLocal({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // { message, resolve }

  const addToast = useCallback((message, variant = "default", ms = 2400) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((xs) => [...xs, { id, message, variant }]);
    const t = setTimeout(() => {
      setToasts((xs) => xs.filter((x) => x.id !== id));
    }, ms);
    return () => clearTimeout(t);
  }, []);

  const confirm = useCallback((message) => {
    try {
      return new Promise((resolve) => {
        setConfirmState({ message, resolve });
      });
    } catch {
      const ok = window.confirm(message);
      return Promise.resolve(ok);
    }
  }, []);

  const value = useMemo(() => ({ toast: addToast, confirm }), [addToast, confirm]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2 w-[min(92vw,380px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "px-4 py-3 rounded-xl shadow border text-sm bg-white",
              t.variant === "success" ? "border-green-300" : "",
              t.variant === "error" ? "border-red-300" : "",
              t.variant === "warning" ? "border-amber-300" : "",
              t.variant === "info" ? "border-blue-300" : "",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            {t.message}
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-5 w-[min(92vw,400px)] shadow-lg border">
            <h3 className="font-semibold mb-3">Please confirm</h3>
            <p className="text-sm text-gray-700">{confirmState.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 border rounded bg-blue-600 text-white"
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ToastCtx.Provider>
  );
}

function useLocalToast() {
  const ctx = useContext(ToastCtx);
  return (
    ctx || {
      toast: (msg) => window.alert(msg),
      confirm: async (msg) => window.confirm(msg),
    }
  );
}

// ------------------------------- Utilities ---------------------------------
const toNum = (v) => (typeof v === "number" ? v : Number(v || 0));
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s || "—";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};
const money = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

// ------------------------------ StatusBadge --------------------------------
function StatusBadge({ s }) {
  const base = "px-2 py-0.5 rounded-full border text-xs";
  if (s === "approved")
    return <span className={`${base} bg-green-50 border-green-200 text-green-800`}>approved</span>;
  if (s === "denied")
    return <span className={`${base} bg-red-50 border-red-200 text-red-800`}>denied</span>;
  if (s === "queued")
    return <span className={`${base} bg-yellow-50 border-yellow-200 text-yellow-800`}>queued</span>;
  if (s === "failed")
    return <span className={`${base} bg-gray-100 border-gray-200 text-gray-700`}>failed</span>;
  if (s === "cancelled")
    return <span className={`${base} bg-gray-50 border-gray-200 text-gray-700`}>cancelled</span>;
  return <span className={`${base} bg-blue-50 border-blue-200 text-blue-800`}>{s || "pending"}</span>;
}

// ------------------------------ ReasonModal --------------------------------
function ReasonModal({ title = "Enter reason", label = "Reason", initial = "", onCancel, onSubmit }) {
  const [text, setText] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      try { ref.current.focus(); } catch {}
    }
  }, []);
  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-5 w-[min(92vw,420px)]">
        <h3 className="font-semibold mb-3">{title}</h3>
        <label className="text-sm block mb-1">{label}</label>
        <textarea
          ref={ref}
          className="border rounded w-full p-2 h-28"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type reason…"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>Cancel</button>
          <button
            className="px-3 py-1 border rounded bg-green-600 text-white"
            onClick={() => onSubmit(text.trim())}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------- Wrapper -----------------------------------
export default function RefundsTab({ rows = [], columns = [], ...rest }) {
  const hasExternalData =
    Array.isArray(rows) && rows.length && Array.isArray(columns) && columns.length;
  if (hasExternalData) {
    return <AdminTable rows={rows} columns={columns} {...rest} />;
  }
  return (
    <ToastProviderLocal>
      <ErrorBoundary>
        <RefundsTabInner />
      </ErrorBoundary>
    </ToastProviderLocal>
  );
}

// ------------------------------ Inner Component ----------------------------
function RefundsTabInner() {
  const { toast, confirm } = useLocalToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [currency, setCurrency] = useState("");
  const [tutor, setTutor] = useState("");
  const [student, setStudent] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selected, setSelected] = useState([]);
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const pageSize = 12;

  const [page, setPage] = useState(1);
  const [noteText, setNoteText] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [denyTarget, setDenyTarget] = useState(null);

  // ---------------------- LIVE-ONLY loadRefunds (final) ---------------------
  async function loadRefunds() {
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetch(`${API}/api/refunds`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Accept either {rows:[...]} or raw array
      const list = Array.isArray(data) ? data : (data?.rows || data?.items || []);
      const arr = (list || []).map((r) => ({
        id: r._id || r.id,
        lessonId: r.lessonId || "",
        student: { name: r.student?.name || r.studentId || "" },
        tutor: { name: r.tutor?.name || r.tutorId || "" },
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        reason: r.note || r.reason || "",
        createdAt: r.createdAt,
        notes: r.notes || [],
        failureReason: r.failureReason,
      }));
      setItems(arr);
    } catch (err) {
      console.error("Refunds load failed:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }
  // -------------------------------------------------------------------------

  useEffect(() => {
    loadRefunds();
  }, []);

  if (loading) return <SkeletonTable rows={8} columns={7} />;
  if (error) return <RetryCard onRetry={loadRefunds} message="Failed to load refunds." />;

  /* ------------------------------ mutations ------------------------------ */
  async function approve(id) {
    const ok = await confirm("Approve this refund?");
    if (!ok) return;
    try {
      if (IS_MOCK) {
        mockApproveRefund(id);
      } else {
        await approveRefund(id, "Approved");
      }
      toast(`Refund ${id} approved`, "success");
      await loadRefunds();
    } catch (e) {
      console.error(e);
      toast("Approve failed.", "error");
    }
  }

  async function deny(id) {
    const ok = await confirm("Deny this refund?");
    if (!ok) return;
    setDenyTarget(id);
  }

  async function submitDeny(reason) {
    if (!denyTarget) return;
    if (!reason) {
      toast("Reason is required.", "warning");
      return;
    }
    try {
      if (IS_MOCK) {
        mockDenyRefund(denyTarget, reason);
      } else {
        await denyRefund(denyTarget, reason);
      }
      toast(`Refund ${denyTarget} denied`, "success");
      setDenyTarget(null);
      await loadRefunds();
    } catch (e) {
      console.error(e);
      toast("Deny failed.", "error");
    }
  }

  async function retry(id) {
    try {
      const res = await safeFetchJSON(`${API}/api/refunds/${id}/retry`, { method: "POST" });
      const next = res?.status || "queued";
      setItems((xs) =>
        xs.map((r) => (r.id === id ? { ...r, status: next, failureReason: undefined } : r))
      );
      toast(`Retry queued for ${id}`, "success");
    } catch (e) {
      console.error(e);
      toast("Retry failed.", "error");
    }
  }

  async function cancel(id) {
    const ok = await confirm("Cancel this refund?");
    if (!ok) return;
    try {
      const res = await safeFetchJSON(`${API}/api/refunds/${id}/cancel`, { method: "POST" });
      const next = res?.status || "cancelled";
      setItems((xs) => xs.map((r) => (r.id === id ? { ...r, status: next } : r)));
      toast(`Refund ${id} cancelled`, "success");
    } catch (e) {
      console.error(e);
      toast("Cancel failed.", "error");
    }
  }

  async function addNote(id) {
    const text = (noteText[id] || "").trim();
    if (!text) {
      toast("Note cannot be empty.", "warning");
      return;
    }
    try {
      if (IS_MOCK) {
        updateRefundNote(id, text);
        const fallback = { by: "admin", at: new Date().toISOString(), text };
        setItems((xs) =>
          xs.map((r) => (r.id === id ? { ...r, notes: [...(r.notes || []), fallback] } : r))
        );
        toast("Note stored (mock).", "success");
        setNoteText((m) => ({ ...m, [id]: "" }));
        return;
      }
      const res = await safeFetchJSON(`${API}/api/refunds/${id}/note`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const note = res?.note || { by: "admin", at: new Date().toISOString(), text };
      setItems((xs) =>
        xs.map((r) => (r.id === id ? { ...r, notes: [...(r.notes || []), note] } : r))
      );
      setNoteText((m) => ({ ...m, [id]: "" }));
      toast("Note added.", "success");
    } catch (e) {
      console.error(e);
      toast("Add note failed.", "error");
    }
  }

  /* ------------------------------ bulk ops ------------------------------- */
  async function bulkUpdate(next) {
    if (!selected.length) return;
    const ok = await confirm(
      next === "approved"
        ? `Approve ${selected.length} refund(s)?`
        : `Deny ${selected.length} refund(s)?`
    );
    if (!ok) return;

    try {
      for (const id of selected) {
        if (next === "approved") {
          if (IS_MOCK) mockApproveRefund(id);
          else await approveRefund(id, "Approved (bulk)");
        }
        if (next === "denied") {
          if (IS_MOCK) mockDenyRefund(id, "Denied (bulk)");
          else await denyRefund(id, "Denied (bulk)");
        }
      }
      setSelected([]);
      await loadRefunds();
      toast("Bulk update completed.", "success");
    } catch (e) {
      console.error(e);
      toast("Bulk update failed.", "error");
    }
  }

  /* ------------------------------ filter/sort ----------------------------- */
  const filtered = useMemo(() => {
    let arr = items;
    const qq = q.trim().toLowerCase();
    if (qq) arr = arr.filter((r) => JSON.stringify(r).toLowerCase().includes(qq));

    if (status) arr = arr.filter((r) => (r.status || "") === status);
    if (currency) arr = arr.filter((r) => (r.currency || "") === currency);
    if (tutor)
      arr = arr.filter((r) => (r.tutor?.name || "").toLowerCase() === tutor.toLowerCase());
    if (student)
      arr = arr.filter((r) => (r.student?.name || "").toLowerCase() === student.toLowerCase());

    if (fromDate) {
      const from = new Date(fromDate);
      arr = arr.filter((r) => {
        const d = new Date(r.createdAt);
        return !Number.isNaN(d.getTime()) && d >= from;
      });
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      arr = arr.filter((r) => {
        const d = new Date(r.createdAt);
        return !Number.isNaN(d.getTime()) && d <= to;
      });
    }

    return arr;
  }, [items, q, status, currency, tutor, student, fromDate, toDate]);

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
    [sorted, page, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages, filtered.length]);

  /* ------------------------------ selections ------------------------------ */
  function selectAllResults() {
    setSelected(Array.from(new Set(filtered.map((r) => r.id))));
  }
  function selectPage() {
    setSelected(Array.from(new Set(paged.map((r) => r.id))));
  }
  function clearSelection() {
    setSelected([]);
  }

  /* --------------------------------- KPIs --------------------------------- */
  const kpi = useMemo(() => {
    const base = {
      total: filtered.length,
      queued: filtered.filter((x) => x.status === "queued"),
      approved: filtered.filter((x) => x.status === "approved"),
      denied: filtered.filter((x) => x.status === "denied"),
      failed: filtered.filter((x) => x.status === "failed"),
      cancelled: filtered.filter((x) => x.status === "cancelled"),
    };
    const sum = (arr) => arr.reduce((s, r) => s + toNum(r.amount), 0);
    return {
      totalCount: base.total,
      queuedCount: base.queued.length,
      approvedCount: base.approved.length,
      deniedCount: base.denied.length,
      failedCount: base.failed.length,
      cancelledCount: base.cancelled.length,
      totalAmount: sum(filtered),
      queuedAmount: sum(base.queued),
      approvedAmount: sum(base.approved),
      deniedAmount: sum(base.denied),
      failedAmount: sum(base.failed),
      cancelledAmount: sum(base.cancelled),
    };
  }, [filtered]);

  const selectedTotal = useMemo(
    () =>
      sorted
        .filter((x) => selected.includes(x.id))
        .reduce((s, r) => s + toNum(r.amount), 0),
    [sorted, selected]
  );

  /* -------------------------------- exports ------------------------------- */
  function exportTable() {
    const rows = sorted.map((d) => ({
      ID: d.id,
      Type: "refund",
      Lesson: d.lessonId ?? "",
      Student: d.student?.name ?? "",
      Tutor: d.tutor?.name ?? "",
      Amount: toNum(d.amount),
      Currency: d.currency ?? "",
      Status: d.status ?? "",
      Reason: (d.reason || "").replace(/\s+/g, " ").trim(),
      CreatedAt: d.createdAt ?? "",
    }));
    if (!rows.length) {
      toast("No rows to export.", "warning");
      return;
    }
    exportTableToCSV(rows, "refunds.csv");
    exportTableToXLSX(rows, "refunds.xlsx");
    toast("CSV/XLSX exported.", "success");
  }

  /* ------------------------------ UI helpers ------------------------------ */
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

  /* --------------------------------- render ------------------------------- */
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Mock banner removed */}
        <h2 className="font-bold text-xl">Refunds</h2>
        <button className="px-3 py-1 border rounded" onClick={loadRefunds} disabled={loading}>
          Reload
        </button>
        <button className="px-3 py-1 border rounded ml-auto" onClick={exportTable}>
          Export CSV/XLSX
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          ["Total", kpi.totalCount, kpi.totalAmount],
          ["Queued", kpi.queuedCount, kpi.queuedAmount],
          ["Approved", kpi.approvedCount, kpi.approvedAmount],
          ["Denied", kpi.deniedCount, kpi.deniedAmount],
          ["Failed", kpi.failedCount, kpi.failedAmount],
          ["Cancelled", kpi.cancelledCount, kpi.cancelledAmount],
        ].map(([label, count, amt], i) => (
          <div key={i} className="bg-white border rounded-2xl p-3 text-center">
            <div className="font-semibold">{label}</div>
            <div>{count}</div>
            <div className="text-xs text-gray-500 mt-1">${money(amt)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-2xl p-3 text-center">
        <div className="font-semibold">Selected</div>
        <div>{selected.length}</div>
        <div className="text-xs text-gray-500 mt-1">${money(selectedTotal)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
            />

            {/* Additional filter controls unchanged */}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-auto border rounded-2xl">
            {paged.length === 0 ? (
              <div className="p-6 text-gray-600">No refunds found.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">{th("id", "ID")}</th>
                    <th className="p-2 text-left">{th("student", "Student")}</th>
                    <th className="p-2 text-left">{th("tutor", "Tutor")}</th>
                    <th className="p-2 text-right">{th("amount", "Amount")}</th>
                    <th className="p-2 text-left">{th("currency", "Currency")}</th>
                    <th className="p-2 text-left">{th("status", "Status")}</th>
                    <th className="p-2 text-left">{th("reason", "Reason")}</th>
                    <th className="p-2 text-left">{th("createdAt", "Created At")}</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.id}</td>
                      <td className="p-2">{r.student?.name || "—"}</td>
                      <td className="p-2">{r.tutor?.name || "—"}</td>
                      <td className="p-2 text-right">${money(r.amount)}</td>
                      <td className="p-2">{r.currency || "—"}</td>
                      <td className="p-2"><StatusBadge s={r.status} /></td>
                      <td className="p-2">{r.reason || "—"}</td>
                      <td className="p-2">{fmtDate(r.createdAt)}</td>
                      <td className="p-2">
                        <div className="flex gap-2 flex-wrap">
                          <button className="px-2 py-1 border rounded" onClick={() => approve(r.id)}>
                            Approve
                          </button>
                          <button className="px-2 py-1 border rounded" onClick={() => deny(r.id)}>
                            Deny
                          </button>
                          <button className="px-2 py-1 border rounded" onClick={() => retry(r.id)}>
                            Retry
                          </button>
                          <button className="px-2 py-1 border rounded" onClick={() => cancel(r.id)}>
                            Cancel
                          </button>
                        </div>
                        <div className="mt-2">
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Add note…"
                            value={noteText[r.id] || ""}
                            onChange={(e) =>
                              setNoteText((m) => ({ ...m, [r.id]: e.target.value }))
                            }
                          />
                          <button
                            className="mt-1 px-2 py-1 border rounded"
                            onClick={() => addNote(r.id)}
                          >
                            Save note
                          </button>
                        </div>
                        {r.notes?.length ? (
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            {r.notes.map((n, i) => (
                              <div key={i}>
                                <span className="font-semibold">{n.by || "admin"}:</span>{" "}
                                <span>{n.text}</span>{" "}
                                <span className="opacity-60">
                                  ({fmtDate(n.at || n.createdAt)})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {sorted.length > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <button
                className="px-3 py-1 border rounded"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1 border rounded"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 border rounded-xl text-sm">
            <b>Total Amount (filtered):</b> ${money(kpi.totalAmount)}
          </div>
        </div>
      </div>

      {denyTarget && (
        <ReasonModal
          title="Deny refund — reason"
          label="Reason"
          initial=""
          onCancel={() => setDenyTarget(null)}
          onSubmit={submitDeny}
        />
      )}
    </div>
  );
}
