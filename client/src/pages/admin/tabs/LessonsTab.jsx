// client/src/pages/admin/tabs/LessonsTab.jsx
// -----------------------------------------------------------------------------
// LessonsTab (Table Layout, Full Feature, Mock-Safe, Consistent with Users/Tutors)
// -----------------------------------------------------------------------------
// ✔ Safe fetch with JWT + robust VITE_MOCK=1 fallbacks
// ✔ AdminTable passthrough preserved if rows/columns provided externally
// ✔ Filters: search, status, type, trial-only/paid-only, tutor, student, date range
// ✔ Sorting: clickable column headers (asc/desc), date-aware for *At fields
// ✔ Selection: per-row, select page, select all results, clear
// ✔ Bulk actions: Approve/Deny reschedule (with confirm + toasts)
// ✔ Row actions: Approve/Deny reschedule, No-Show, Grant Trial, Refund (confirm + toasts)
// ✔ Pagination
// ✔ Export: CSV + XLSX (dynamic import)
// ✔ KPIs: counts by status/type, trials used/left, totals
// ✔ Summaries: total duration (mins), by currency, by tutor
// ✔ Trial usage badges using getStudentTrialUsage / canBookTrial
// ✔ UI polish: consistent badges, accessible buttons, error toasts
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import AdminTable from "./AdminTableShim.jsx";
import { getStudentTrialUsage, canBookTrial } from "@/lib/trials.js";
import { useToast, useConfirm } from "@/ui/ToastProvider.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/* --------------------------------- helpers --------------------------------- */
const toNum = (v) => (typeof v === "number" ? v : Number(v || 0));
const pad = (n) => String(n).padStart(2, "0");
const fmt2 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "0.00");
const isDate = (s) => {
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
};
const minsBetween = (a, b) => {
  const A = new Date(a);
  const B = new Date(b);
  if (Number.isNaN(A.getTime()) || Number.isNaN(B.getTime())) return 0;
  return Math.max(0, Math.round((B - A) / 60000));
};
const fmtDate = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s || "—";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
};

/* ----------------------------- safe fetch JSON ----------------------------- */
async function safeFetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const r = await fetch(url, { headers, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    return text ? JSON.parse(text) : { ok: true };
  } catch (e) {
    if (!IS_MOCK) throw e;

    // ---- MOCK FALLBACKS ----
    if (url.endsWith("/api/admin/lessons") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          {
            id: "L1",
            type: "trial",
            isTrial: true,
            status: "scheduled",
            startAt: "2025-10-01T09:00:00Z",
            endAt: "2025-10-01T09:30:00Z",
            student: { id: "u1", name: "Alice" },
            tutor: { id: "t1", name: "Bob" },
            price: 15,
            currency: "USD",
            reschedule: { requested: true },
          },
          {
            id: "L2",
            type: "standard",
            isTrial: false,
            status: "completed",
            startAt: "2025-10-02T10:00:00Z",
            endAt: "2025-10-02T11:00:00Z",
            student: { id: "u1", name: "Alice" },
            tutor: { id: "t2", name: "Dana" },
            price: 25,
            currency: "USD",
            reschedule: { requested: false },
          },
          {
            id: "L3",
            type: "standard",
            isTrial: false,
            status: "cancelled",
            startAt: "2025-10-03T12:00:00Z",
            endAt: "2025-10-03T13:00:00Z",
            student: { id: "u2", name: "Chris" },
            tutor: { id: "t2", name: "Dana" },
            price: 22,
            currency: "EUR",
            reschedule: { requested: false },
          },
        ],
      };
    }

    // Row actions (approve/deny/no-show/grant/refund) — ok in mock
    if (
      url.includes("/api/admin/lessons/") &&
      /\/(approve-reschedule|deny-reschedule|no-show|grant-trial|refund)$/.test(url)
    ) {
      return { ok: true };
    }

    return { ok: true };
  }
}

/* ================================= component ================================ */
export default function LessonsTab({ rows = [], columns = [], ...rest }) {
  // Toast + confirm hooks
  const toast = useToast();
  const confirm = useConfirm();

  // ── Passthrough: keep AdminTable compatibility if parent supplies rows/columns
  const hasExternal =
    Array.isArray(rows) && rows.length && Array.isArray(columns) && columns.length;
  if (hasExternal) {
    return <AdminTable rows={rows} columns={columns} {...rest} />;
  }

  // ── Core state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ── Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // scheduled|completed|cancelled
  const [type, setType] = useState(""); // trial|standard
  const [trialFilter, setTrialFilter] = useState(""); // "", "trial", "paid"
  const [tutor, setTutor] = useState("");
  const [student, setStudent] = useState("");
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState(""); // YYYY-MM-DD

  // ── Sorting + selection + paging
  const [sort, setSort] = useState({ key: "startAt", dir: "desc" });
  const [selected, setSelected] = useState([]); // lesson IDs
  const pageSize = 12;
  const [page, setPage] = useState(1);

  /* ---------------------------------- load ---------------------------------- */
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await safeFetchJSON(`${API}/api/admin/lessons`);
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(arr);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load lessons");
      toast("Failed to load lessons.", "error");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------- row actions ------------------------------ */
  async function approveReschedule(id) {
    await safeFetchJSON(`${API}/api/admin/lessons/${id}/approve-reschedule`, { method: "POST" });
    if (!IS_MOCK) await load();
    if (IS_MOCK) {
      setItems((xs) =>
        xs.map((l) =>
          l.id === id ? { ...l, reschedule: { ...l.reschedule, requested: false } } : l
        )
      );
    }
  }
  async function denyReschedule(id) {
    await safeFetchJSON(`${API}/api/admin/lessons/${id}/deny-reschedule`, { method: "POST" });
    if (!IS_MOCK) await load();
    if (IS_MOCK) {
      setItems((xs) =>
        xs.map((l) =>
          l.id === id ? { ...l, reschedule: { ...l.reschedule, requested: false } } : l
        )
      );
    }
  }
  async function markNoShow(id) {
    await safeFetchJSON(`${API}/api/admin/lessons/${id}/no-show`, { method: "POST" });
    if (!IS_MOCK) await load();
  }
  async function grantTrial(id) {
    await safeFetchJSON(`${API}/api/admin/lessons/${id}/grant-trial`, { method: "POST" });
    if (!IS_MOCK) await load();
  }
  async function refundLesson(id) {
    await safeFetchJSON(`${API}/api/admin/lessons/${id}/refund`, { method: "POST" });
    if (!IS_MOCK) await load();
  }

  /* --------------------------- row actions (safe UI) -------------------------- */
  async function onApproveReschedule(id) {
    const ok = await confirm({
      title: "Approve reschedule?",
      message: "This will confirm the student's reschedule request for this lesson.",
      confirmText: "Approve",
      cancelText: "Cancel",
      tone: "success",
    });
    if (!ok) return;
    try {
      await approveReschedule(id);
      toast("Reschedule approved.", "success");
    } catch {
      toast("Approve failed.", "error");
    }
  }

  async function onDenyReschedule(id) {
    const ok = await confirm({
      title: "Deny reschedule?",
      message:
        "This will deny the student's reschedule request for this lesson. Are you sure?",
      confirmText: "Deny",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await denyReschedule(id);
      toast("Reschedule denied.", "success");
    } catch {
      toast("Deny failed.", "error");
    }
  }

  async function onNoShow(id) {
    const ok = await confirm({
      title: "Mark no-show?",
      message: "Mark this lesson as a no-show?",
      confirmText: "Mark",
      cancelText: "Cancel",
      tone: "warning",
    });
    if (!ok) return;
    try {
      await markNoShow(id);
      toast("Marked as no-show.", "success");
    } catch {
      toast("Action failed.", "error");
    }
  }

  async function onGrantTrial(id) {
    const ok = await confirm({
      title: "Grant trial?",
      message: "Grant a trial for this lesson/student?",
      confirmText: "Grant",
      cancelText: "Cancel",
      tone: "success",
    });
    if (!ok) return;
    try {
      await grantTrial(id);
      toast("Trial granted.", "success");
    } catch {
      toast("Grant failed.", "error");
    }
  }

  async function onRefund(id) {
    const ok = await confirm({
      title: "Refund lesson?",
      message: "This will create a refund request for this lesson.",
      confirmText: "Refund",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await refundLesson(id);
      toast("Refund queued.", "success");
    } catch {
      toast("Refund failed.", "error");
    }
  }

  /* -------------------------------- bulk ops -------------------------------- */
  async function bulkUpdate(action) {
    if (!selected.length) return;
    const label = action === "approve" ? "Approve" : "Deny";
    const ok = await confirm({
      title: `${label} ${selected.length} reschedule(s)?`,
      message: `This will ${label.toLowerCase()} all selected reschedule requests.`,
      confirmText: label,
      cancelText: "Cancel",
      tone: action === "approve" ? "success" : "danger",
    });
    if (!ok) return;

    try {
      for (const id of selected) {
        // eslint-disable-next-line no-await-in-loop
        if (action === "approve") await approveReschedule(id);
        // eslint-disable-next-line no-await-in-loop
        if (action === "deny") await denyReschedule(id);
      }
      setSelected([]);
      toast(`Bulk ${label.toLowerCase()} complete.`, "success");
    } catch {
      toast("Bulk action encountered an error.", "error");
    }
  }

  /* -------------------------- derived: filter/sort/page -------------------------- */
  const tutors = useMemo(
    () => Array.from(new Set(items.map((l) => l.tutor?.name).filter(Boolean))).sort(),
    [items]
  );
  const students = useMemo(
    () => Array.from(new Set(items.map((l) => l.student?.name).filter(Boolean))).sort(),
    [items]
  );
  const currencies = useMemo(
    () => Array.from(new Set(items.map((l) => l.currency).filter(Boolean))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    let arr = items;

    const qq = q.trim().toLowerCase();
    if (qq) arr = arr.filter((r) => JSON.stringify(r).toLowerCase().includes(qq));

    if (status) arr = arr.filter((r) => (r.status || "") === status);
    if (type) arr = arr.filter((r) => (r.type || "") === type);
    if (trialFilter === "trial") arr = arr.filter((r) => !!r.isTrial);
    if (trialFilter === "paid") arr = arr.filter((r) => !r.isTrial);
    if (tutor) arr = arr.filter((r) => (r.tutor?.name || "").toLowerCase() === tutor.toLowerCase());
    if (student) arr = arr.filter((r) => (r.student?.name || "").toLowerCase() === student.toLowerCase());

    if (fromDate) {
      const from = new Date(fromDate);
      arr = arr.filter((r) => isDate(r.startAt) && new Date(r.startAt) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      arr = arr.filter((r) => isDate(r.endAt || r.startAt) && new Date(r.endAt || r.startAt) <= to);
    }

    return arr;
  }, [items, q, status, type, trialFilter, tutor, student, fromDate, toDate]);

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
    setPage(1);
  }, [q, status, type, trialFilter, tutor, student, fromDate, toDate]);

  /* ----------------------------------- KPI ----------------------------------- */
  const kpi = useMemo(() => {
    const total = filtered.length;
    const scheduled = filtered.filter((l) => l.status === "scheduled").length;
    const completed = filtered.filter((l) => l.status === "completed").length;
    const cancelled = filtered.filter((l) => l.status === "cancelled").length;
    const trials = filtered.filter((l) => !!l.isTrial).length;
    const paid = total - trials;
    const totalDurationMins = filtered.reduce((s, l) => s + minsBetween(l.startAt, l.endAt), 0);
    const totalRevenue = filtered.reduce((s, l) => s + toNum(l.price), 0);

    return {
      total,
      scheduled,
      completed,
      cancelled,
      trials,
      paid,
      totalDurationMins,
      totalRevenue,
    };
  }, [filtered]);

  /* -------------------------------- exports -------------------------------- */
  function exportCSV() {
    const headers = [
      "ID",
      "Type",
      "IsTrial",
      "Status",
      "Tutor",
      "Student",
      "Price",
      "Currency",
      "StartAt",
      "EndAt",
      "DurationMins",
      "TrialUsed",
      "TrialsLeft",
    ];
    const body = items.map((l) => {
      const usage = getStudentTrialUsage(items, l.student?.id);
      return [
        l.id,
        l.type || (l.isTrial ? "trial" : "standard"),
        l.isTrial ? "yes" : "no",
        l.status || "",
        l.tutor?.name || "",
        l.student?.name || "",
        l.price ?? "",
        l.currency || "",
        l.startAt || "",
        l.endAt || "",
        minsBetween(l.startAt, l.endAt),
        usage.totalUsed,
        usage.left,
      ];
    });
    const csv = [headers, ...body].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lessons.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX() {
    const xlsxMod = await import("xlsx");
    const XLSX = xlsxMod.default || xlsxMod;
    const rows = items.map((l) => {
      const usage = getStudentTrialUsage(items, l.student?.id);
      return {
        ID: l.id,
        Type: l.type || (l.isTrial ? "trial" : "standard"),
        IsTrial: l.isTrial ? "yes" : "no",
        Status: l.status || "",
        Tutor: l.tutor?.name || "",
        Student: l.student?.name || "",
        Price: toNum(l.price),
        Currency: l.currency || "",
        StartAt: l.startAt || "",
        EndAt: l.endAt || "",
        DurationMins: minsBetween(l.startAt, l.endAt),
        TrialUsed: usage.totalUsed,
        TrialsLeft: usage.left,
      };
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Lessons");
    XLSX.writeFile(wb, "lessons.xlsx");
  }

  /* ------------------------------ UI helpers ------------------------------ */
  function th(colKey, label) {
    return (
      <button
        onClick={() =>
          setSort((s) =>
            s.key === colKey ? { key: colKey, dir: s.dir === "asc" ? "desc" : "asc" } : { key: colKey, dir: "asc" }
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

  /* ------------------------------ selection ------------------------------ */
  function selectAllResults() {
    setSelected(Array.from(new Set(filtered.map((r) => r.id))));
  }
  function selectPage() {
    setSelected(Array.from(new Set(paged.map((r) => r.id))));
  }
  function clearSelection() {
    setSelected([]);
  }

  /* --------------------------------- render -------------------------------- */
  return (
    <div className="p-4 space-y-4">
      {/* Header + Export */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold text-xl">
          Lessons {IS_MOCK && <span className="text-sm font-normal opacity-60">(Mock)</span>}
        </h2>
        <button className="px-3 py-1 border rounded ml-auto" onClick={exportCSV}>
          Export CSV
        </button>
        <button className="px-3 py-1 border rounded" onClick={exportXLSX}>
          Export XLSX
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Total</div>
          <div>{kpi.total}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Scheduled</div>
          <div>{kpi.scheduled}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Completed</div>
          <div>{kpi.completed}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Cancelled</div>
          <div>{kpi.cancelled}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Trials</div>
          <div>{kpi.trials}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Total Revenue</div>
          <div>${fmt2(kpi.totalRevenue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Filters */}
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

            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All status</option>
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>

            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All types</option>
              <option value="trial">trial</option>
              <option value="standard">standard</option>
            </select>

            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={trialFilter}
              onChange={(e) => {
                setTrialFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All lessons</option>
              <option value="trial">Only trials</option>
              <option value="paid">Only paid</option>
            </select>

            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={tutor}
              onChange={(e) => {
                setTutor(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All tutors</option>
              {tutors.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={student}
              onChange={(e) => {
                setStudent(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                className="border rounded px-2 py-1 flex-1"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="border rounded px-2 py-1 flex-1"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setType("");
                  setTrialFilter("");
                  setTutor("");
                  setStudent("");
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
              >
                Clear
              </button>
              <button className="px-3 py-1 border rounded" onClick={load} disabled={loading}>
                {loading ? "Loading…" : "Reload"}
              </button>
            </div>

            {/* Bulk actions */}
            <div className="flex gap-2 mt-3">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => bulkUpdate("approve")}
                disabled={!selected.length}
              >
                Bulk Approve Reschedule
              </button>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => bulkUpdate("deny")}
                disabled={!selected.length}
              >
                Bulk Deny Reschedule
              </button>
            </div>

            {/* Selection tools */}
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
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-2">
          <div className="overflow-auto border rounded-2xl">
            {loading ? (
              <div className="p-6 text-gray-600">Loading…</div>
            ) : err ? (
              <div className="p-6 text-red-600">{err}</div>
            ) : paged.length === 0 ? (
              <div className="p-6 text-gray-600">No lessons found.</div>
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
                    <th className="px-3 py-2 border-b text-left">{th("type", "Type")}</th>
                    <th className="px-3 py-2 border-b text-left">{th("isTrial", "Trial")}</th>
                    <th className="px-3 py-2 border-b text-left">{th("status", "Status")}</th>
                    <th className="px-3 py-2 border-b text-left">{th("tutor", "Tutor")}</th>
                    <th className="px-3 py-2 border-b text-left">{th("student", "Student")}</th>
                    <th className="px-3 py-2 border-b text-right">{th("price", "Price")}</th>
                    <th className="px-3 py-2 border-b text-left">{th("currency", "Currency")}</th>
                    <th className="px-3 py-2 border-b text-left">{th("startAt", "Start")}</th>
                    <th className="px-3 py-2 border-b text-left">{th("endAt", "End")}</th>
                    <th className="px-3 py-2 border-b text-right">Duration</th>
                    <th className="px-3 py-2 border-b text-left">Reschedule</th>
                    <th className="px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((l) => {
                    const usage = getStudentTrialUsage(items, l.student?.id);
                    const canTrial = l.isTrial ? true : canBookTrial(items, l.student?.id, l.tutor?.id);
                    return (
                      <tr key={l.id} className="border-t align-top">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.includes(l.id)}
                            onChange={(e) =>
                              setSelected((s) =>
                                e.target.checked ? [...new Set([...s, l.id])] : s.filter((x) => x !== l.id)
                              )
                            }
                            aria-label={`Select lesson ${l.id}`}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{l.id}</td>
                        <td className="px-3 py-2">
                          {l.type || (l.isTrial ? "trial" : "standard")}
                          {l.isTrial ? (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-amber-50">
                              trial
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{l.isTrial ? "yes" : "no"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full border ${
                              l.status === "completed"
                                ? "bg-green-50 border-green-200"
                                : l.status === "scheduled"
                                ? "bg-blue-50 border-blue-200"
                                : l.status === "cancelled"
                                ? "bg-red-50 border-red-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            {l.status || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">{l.tutor?.name || "—"}</td>
                        <td className="px-3 py-2">
                          {l.student?.name || "—"}
                          {l.isTrial && !canTrial && (
                            <span className="ml-2 text-xs text-red-600 font-semibold">
                              ❌ Trial limit reached
                            </span>
                          )}
                          <div className="text-xs text-gray-600">
                            Trials used: {usage.totalUsed}/3, left: {usage.left}, tutors:{" "}
                            {usage.byTutor.join(", ")}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmt2(l.price ?? 0)} <span className="text-xs">{l.currency || "USD"}</span>
                        </td>
                        <td className="px-3 py-2">{l.currency || "—"}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(l.startAt)}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(l.endAt)}</td>
                        <td className="px-3 py-2 text-right">
                          {minsBetween(l.startAt, l.endAt)} min
                        </td>
                        <td className="px-3 py-2">
                          {l.reschedule?.requested ? (
                            <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-50">
                              requested
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {l.reschedule?.requested && (
                              <>
                                <button
                                  className="px-2 py-1 border rounded"
                                  onClick={() => onApproveReschedule(l.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="px-2 py-1 border rounded"
                                  onClick={() => onDenyReschedule(l.id)}
                                >
                                  Deny
                                </button>
                              </>
                            )}
                            <button className="px-2 py-1 border rounded" onClick={() => onNoShow(l.id)}>
                              No-Show
                            </button>
                            <button className="px-2 py-1 border rounded" onClick={() => onGrantTrial(l.id)}>
                              Grant Trial
                            </button>
                            <button className="px-2 py-1 border rounded" onClick={() => onRefund(l.id)}>
                              Refund
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
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

          {/* Summaries */}
          <div className="mt-4 p-3 bg-gray-50 border rounded-xl text-sm">
            <div>
              <b>Total Duration (filtered):</b> {kpi.totalDurationMins} minutes
            </div>
            <div className="mt-1">
              <b>By Currency:</b>{" "}
              {Object.entries(
                filtered.reduce((acc, x) => {
                  const c = x.currency || "USD";
                  acc[c] = (acc[c] || 0) + toNum(x.price);
                  return acc;
                }, {})
              )
                .map(([c, v]) => `${c}: ${fmt2(v)}`)
                .join(", ") || "—"}
            </div>
            <div className="mt-1">
              <b>By Tutor (revenue):</b>{" "}
              {Object.entries(
                filtered.reduce((acc, x) => {
                  const key = x.tutor?.name || "Unknown";
                  acc[key] = (acc[key] || 0) + toNum(x.price);
                  return acc;
                }, {})
              )
                .map(([name, v]) => `${name}: $${fmt2(v)}`)
                .join(", ") || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
