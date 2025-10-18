// client/src/pages/admin/tabs/DisputesTab.jsx
// MERGED + WARN ADDED: keeps your features; adds Approve/Deny/Warn, CSV, large mock, sorting, pagination.

import React, { useEffect, useMemo, useState } from "react";
import AdminTable from "./AdminTableShim.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

// ---------- utils ----------
const pad2 = (n) => String(n).padStart(2, "0");
const formatDate = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
};
const deepIncludes = (obj, needle) => {
  try {
    return JSON.stringify(obj).toLowerCase().includes(needle);
  } catch {
    return false;
  }
};
const csvEscape = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (amt, cur = "USD") => (typeof amt === "number" ? `${amt.toFixed(2)} ${cur}` : "");

// ---------- mock seed (bigger) ----------
function randomFrom(a) {
  return a[Math.floor(Math.random() * a.length)];
}
function seedMockDisputesLarge() {
  const KEY = "mock_disputes_seed_v2";
  const ex = localStorage.getItem(KEY);
  if (ex) return JSON.parse(ex);
  const reasons = [
    "Tutor no-show",
    "Lesson quality not as expected",
    "Scheduling confusion",
    "Connection problems",
    "Unauthorized payment claimed",
    "Tutor arrived late",
  ];
  const types = ["refund", "chargeback", "fraud", "other"];
  const statuses = ["open", "pending", "resolved", "rejected"];
  const currencies = ["USD", "EUR", "GBP", "AUD"];
  const items = Array.from({ length: 75 }).map((_, i) => ({
    id: `D${1000 + i}`,
    type: randomFrom(types),
    lessonId: `L${5000 + i}`,
    student: { id: `u${i + 1}`, name: `Student ${i + 1}`, email: `student${i + 1}@example.com` },
    tutor: { id: `t${(i % 30) + 1}`, name: `Tutor ${(i % 30) + 1}`, email: `tutor${(i % 30) + 1}@example.com` },
    amount: i % 4 === 0 ? Math.round((10 + (i % 6) * 5) * 100) / 100 : 0,
    currency: randomFrom(currencies),
    reason: randomFrom(reasons),
    status: randomFrom(statuses),
    notes:
      i % 6 === 0
        ? [
            { by: "admin1", at: new Date(Date.now() - 86400000).toISOString(), text: "Requested evidence." },
            { by: "admin2", at: new Date(Date.now() - 3600000).toISOString(), text: "Waiting on reply." },
          ]
        : [],
    createdAt: new Date(Date.now() - i * 43200000).toISOString(),
  }));
  if (items[1]) items[1].status = "approved_refund";
  if (items[2]) items[2].status = "denied";
  if (items[3]) items[3].status = "warning_tutor";
  if (items[4]) items[4].status = "warning_student";
  localStorage.setItem(KEY, JSON.stringify(items));
  return items;
}

// ---------- safe fetch with mock fallbacks ----------
async function safeFetchJSON(url, opts = {}) {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    JSON.parse(localStorage.getItem("auth") || "{}")?.token ||
    "";
  const baseHeaders = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  try {
    const r = await fetch(url, { headers: baseHeaders, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = await r.text();
    return t ? JSON.parse(t) : { ok: true };
  } catch (e) {
    if (!IS_MOCK) throw e;

    if (url.endsWith("/api/disputes") && (!opts.method || opts.method === "GET")) {
      const large = seedMockDisputesLarge();
      const yours = [
        {
          id: "D1",
          type: "refund",
          lessonId: "L1001",
          student: { id: "u1", name: "Alice Student", email: "alice@example.com" },
          tutor: { id: "t1", name: "Bob Tutor", email: "bob@example.com" },
          amount: 25,
          currency: "USD",
          reason: "Lesson quality not as expected",
          status: "open",
          notes: [],
          createdAt: "2025-09-30T09:30:00Z",
        },
        {
          id: "D2",
          type: "chargeback",
          lessonId: "L1002",
          student: { id: "u2", name: "Chris Learner", email: "chris@example.com" },
          tutor: { id: "t2", name: "Dana Coach", email: "dana@example.com" },
          amount: 40,
          currency: "EUR",
          reason: "Unauthorized payment claimed",
          status: "pending",
          notes: [{ by: "admin1", at: "2025-09-30T12:10:00Z", text: "Requested evidence from tutor." }],
          createdAt: "2025-09-30T10:10:00Z",
        },
      ];
      const map = new Map();
      for (const d of yours.concat(large)) map.set(d.id, d);
      return { items: Array.from(map.values()) };
    }

    if (url.includes("/api/disputes/") && url.endsWith("/status")) return { ok: true };
    if (url.includes("/api/disputes/") && url.endsWith("/note")) {
      const body = opts?.body ? JSON.parse(opts.body) : {};
      return { ok: true, note: { by: "admin", at: new Date().toISOString(), text: body?.text || "" } };
    }
    if (url.includes("/api/disputes/") && url.endsWith("/approve-refund")) return { ok: true, status: "approved_refund" };
    if (url.includes("/api/disputes/") && url.endsWith("/deny")) return { ok: true, status: "denied" };
    if (url.includes("/api/disputes/") && url.endsWith("/warn")) {
      const body = opts?.body ? JSON.parse(opts.body) : {};
      const who = body?.who === "student" ? "warning_student" : "warning_tutor";
      return { ok: true, status: who };
    }

    return { ok: true };
  }
}

// ---------- component ----------
export default function DisputesTab({ rows = [], columns = [], ...rest }) {
  const hasExternalData = Array.isArray(rows) && rows.length && Array.isArray(columns) && columns.length;
  if (hasExternalData) return <AdminTable rows={rows} columns={columns} {...rest} />;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [tutor, setTutor] = useState("");
  const [student, setStudent] = useState("");

  const [noteText, setNoteText] = useState({});
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setPage(1), [q, status, type, tutor, student, pageSize]);

  async function load() {
    setLoading(true);
    try {
      const data = await safeFetchJSON(`${API}/api/disputes`);
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(arr);
    } catch (e) {
      console.error(e);
      alert("Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, next) {
    try {
      await safeFetchJSON(`${API}/api/disputes/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setItems((xs) => xs.map((d) => (d.id === id ? { ...d, status: next } : d)));
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    }
  }

  async function addNote(id) {
    const text = (noteText[id] || "").trim();
    if (!text) return;
    try {
      const res = await safeFetchJSON(`${API}/api/disputes/${id}/note`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const note = res?.note || { by: "admin", at: new Date().toISOString(), text };
      setItems((xs) => xs.map((d) => (d.id === id ? { ...d, notes: [...(d.notes || []), note] } : d)));
      setNoteText((m) => ({ ...m, [id]: "" }));
    } catch (e) {
      console.error(e);
      alert("Failed to add note.");
    }
  }

  // NEW: actions
  async function approveRefund(id) {
    try {
      const res = await safeFetchJSON(`${API}/api/disputes/${id}/approve-refund`, { method: "POST" });
      const next = res?.status || "approved_refund";
      setItems((xs) => xs.map((d) => (d.id === id ? { ...d, status: next } : d)));
    } catch {
      await updateStatus(id, "approved_refund");
    }
  }
  async function denyDispute(id) {
    try {
      const res = await safeFetchJSON(`${API}/api/disputes/${id}/deny`, { method: "POST" });
      const next = res?.status || "denied";
      setItems((xs) => xs.map((d) => (d.id === id ? { ...d, status: next } : d)));
    } catch {
      await updateStatus(id, "denied");
    }
  }
  async function warnParty(id, who = "tutor") {
    try {
      const res = await safeFetchJSON(`${API}/api/disputes/${id}/warn`, {
        method: "POST",
        body: JSON.stringify({ who }),
      });
      const next = res?.status || (who === "student" ? "warning_student" : "warning_tutor");
      setItems((xs) => xs.map((d) => (d.id === id ? { ...d, status: next } : d)));
    } catch {
      await updateStatus(id, who === "student" ? "warning_student" : "warning_tutor");
    }
  }

  function toggleSelect(id) {
    setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  }
  async function bulkUpdate(next) {
    for (const id of selected) {
      // eslint-disable-next-line no-await-in-loop
      await updateStatus(id, next);
    }
    setSelected([]);
  }

  const tutorOptions = useMemo(() => Array.from(new Set(items.map((d) => d.tutor?.name).filter(Boolean))), [items]);
  const studentOptions = useMemo(() => Array.from(new Set(items.map((d) => d.student?.name).filter(Boolean))), [items]);

  const filtered = useMemo(() => {
    let arr = items;
    const qq = q.trim().toLowerCase();
    if (qq) arr = arr.filter((d) => deepIncludes(d, qq));
    if (status) arr = arr.filter((d) => (d.status || "") === status);
    if (type) arr = arr.filter((d) => (d.type || "") === type);
    if (tutor) arr = arr.filter((d) => (d.tutor?.name || "") === tutor);
    if (student) arr = arr.filter((d) => (d.student?.name || "") === student);
    return arr;
  }, [items, q, status, type, tutor, student]);

  const filteredSorted = useMemo(() => {
    const arr = [...filtered];
    const cmpStr = (a, b) => String(a || "").localeCompare(String(b || ""));
    if (sortKey === "createdAt") arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortKey === "amount") arr.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    else if (sortKey === "status") arr.sort((a, b) => cmpStr(a.status, b.status));
    else if (sortKey === "type") arr.sort((a, b) => cmpStr(a.type, b.type));
    else if (sortKey === "student") arr.sort((a, b) => cmpStr(a.student?.name, b.student?.name));
    else if (sortKey === "tutor") arr.sort((a, b) => cmpStr(a.tutor?.name, b.tutor?.name));
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const paged = useMemo(() => filteredSorted.slice((page - 1) * pageSize, page * pageSize), [filteredSorted, page, pageSize]);

  const statusClass = (s) =>
    s === "open"
      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : s === "pending"
      ? "bg-blue-50 border-blue-200 text-blue-800"
      : s === "resolved" || s === "approved_refund"
      ? "bg-green-50 border-green-200 text-green-800"
      : s === "rejected" || s === "denied"
      ? "bg-red-50 border-red-200 text-red-800"
      : s?.startsWith("warning_")
      ? "bg-purple-50 border-purple-200 text-purple-800"
      : "bg-gray-100 border-gray-200 text-gray-800";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Filters */}
      <div className="lg:col-span-1">
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Filters</h2>
          <input className="border rounded-lg px-3 py-2 w-full mb-2" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="border rounded-lg px-2 py-2 w-full mb-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="open">open</option>
            <option value="pending">pending</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
            <option value="approved_refund">approved_refund</option>
            <option value="denied">denied</option>
            <option value="warning_tutor">warning_tutor</option>
            <option value="warning_student">warning_student</option>
          </select>
          <select className="border rounded-lg px-2 py-2 w-full mb-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="refund">refund</option>
            <option value="chargeback">chargeback</option>
            <option value="fraud">fraud</option>
            <option value="other">other</option>
          </select>
          <select value={tutor} onChange={(e) => setTutor(e.target.value)} className="border rounded px-2 py-2 w-full mb-2">
            <option value="">All tutors</option>
            {tutorOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select value={student} onChange={(e) => setStudent(e.target.value)} className="border rounded px-2 py-2 w-full mb-3">
            <option value="">All students</option>
            {studentOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2">
              <label className="text-sm w-16">Sort</label>
              <select className="border rounded px-2 py-1 flex-1" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="createdAt">createdAt</option>
                <option value="amount">amount</option>
                <option value="status">status</option>
                <option value="type">type</option>
                <option value="student">student</option>
                <option value="tutor">tutor</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-16">Order</label>
              <select className="border rounded px-2 py-1 flex-1" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm w-24">Rows/page</label>
            <select className="border rounded px-2 py-1" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 border rounded-lg"
              onClick={() => {
                setQ("");
                setStatus("");
                setType("");
                setTutor("");
                setStudent("");
                setSortKey("createdAt");
                setSortDir("desc");
                setPageSize(25);
                setPage(1);
              }}
            >
              Clear
            </button>
            <button className="px-3 py-2 border rounded-lg" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Reload"}
            </button>
            <button className="px-3 py-2 border rounded-lg" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <div className="bg-white border rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-bold">Disputes</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => bulkUpdate("resolved")} disabled={!selected.length}>
                Bulk Resolve
              </button>
              <button className="px-3 py-1 border rounded" onClick={() => bulkUpdate("rejected")} disabled={!selected.length}>
                Bulk Reject
              </button>
            </div>
          </div>

          {loading ? (
            <div>Loading…</div>
          ) : filteredSorted.length === 0 ? (
            <div className="text-gray-600">No disputes found.</div>
          ) : (
            <>
              <ul className="space-y-3">
                {paged.map((d) => (
                  <li
                    key={d.id}
                    className={`border rounded-xl p-3 ${
                      d.status === "open" ? "bg-red-50" : d.status?.startsWith("warning_") ? "bg-purple-50" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} />
                        <div className="font-semibold">
                          {d.type || "dispute"} — #{d.id}
                          <span className="ml-2 text-xs text-gray-500">Lesson {d.lessonId}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(d.createdAt)}</div>
                    </div>

                    <div className="text-sm text-gray-800 mt-1">{d.reason}</div>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                      <span className={`px-2 py-0.5 rounded-full border ${statusClass(d.status)}`}>{d.status || "open"}</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800">{d.type || "refund"}</span>
                      {typeof d.amount === "number" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">{money(d.amount, d.currency)}</span>
                      )}
                      {d.student?.name && <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">student: {d.student.name}</span>}
                      {d.tutor?.name && <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">tutor: {d.tutor.name}</span>}
                    </div>

                    <div className="mt-3 grid grid-cols-1 xl:grid-cols-3 gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm w-16">Status</label>
                        <select
                          className="border rounded-lg px-2 py-1 flex-1"
                          value={d.status || "open"}
                          onChange={(e) => updateStatus(d.id, e.target.value)}
                        >
                          <option value="open">open</option>
                          <option value="pending">pending</option>
                          <option value="resolved">resolved</option>
                          <option value="rejected">rejected</option>
                          <option value="approved_refund">approved_refund</option>
                          <option value="denied">denied</option>
                          <option value="warning_tutor">warning_tutor</option>
                          <option value="warning_student">warning_student</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="px-3 py-1 border rounded" onClick={() => updateStatus(d.id, "resolved")} disabled={(d.status || "") === "resolved"}>
                          Resolve
                        </button>
                        <button className="px-3 py-1 border rounded" onClick={() => updateStatus(d.id, "rejected")} disabled={(d.status || "") === "rejected"}>
                          Reject
                        </button>

                        {/* NEW: Approve/Deny specialized */}
                        <button className="px-3 py-1 border rounded bg-green-600 text-white" onClick={() => approveRefund(d.id)} disabled={(d.status || "") === "approved_refund"}>
                          Approve Refund
                        </button>
                        <button className="px-3 py-1 border rounded bg-red-600 text-white" onClick={() => denyDispute(d.id)} disabled={(d.status || "") === "denied"}>
                          Deny
                        </button>

                        {/* NEW: Warn menu */}
                        <div className="relative group">
                          <button className="px-3 py-1 border rounded bg-blue-600 text-white">Warn</button>
                          <div className="absolute hidden group-hover:flex flex-col bg-white border rounded shadow mt-1 z-10">
                            <button className="px-3 py-1 text-xs hover:bg-gray-100 text-left" onClick={() => warnParty(d.id, "tutor")}>
                              Warn tutor
                            </button>
                            <button className="px-3 py-1 text-xs hover:bg-gray-100 text-left" onClick={() => warnParty(d.id, "student")}>
                              Warn student
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm w-12">Note</label>
                        <input
                          className="border rounded-lg px-2 py-1 flex-1"
                          placeholder="Add internal note…"
                          value={noteText[d.id] || ""}
                          onChange={(e) => setNoteText((m) => ({ ...m, [d.id]: e.target.value }))}
                        />
                        <button className="px-2 py-1 border rounded" onClick={() => addNote(d.id)}>
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <button className="px-2 py-1 border rounded" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                        {expanded === d.id ? "Hide Details" : "Show Details"}
                      </button>
                      {expanded === d.id && (
                        <div className="mt-2 text-sm text-gray-700 border-t pt-2 space-y-1">
                          <div>
                            <b>Reason:</b> {d.reason}
                          </div>
                          <div>
                            <b>Student:</b> {d.student?.name} ({d.student?.email})
                          </div>
                          <div>
                            <b>Tutor:</b> {d.tutor?.name} ({d.tutor?.email})
                          </div>
                          <div>
                            <b>Amount:</b> {typeof d.amount === "number" ? money(d.amount, d.currency) : "—"}
                          </div>
                          <div>
                            <b>Status:</b> {d.status}
                          </div>
                          <div>
                            <b>Created:</b> {formatDate(d.createdAt)}
                          </div>
                          {Array.isArray(d.notes) && d.notes.length > 0 && (
                            <div>
                              <b>Notes:</b>
                              <ul className="mt-1 space-y-1">
                                {d.notes.map((n, idx) => (
                                  <li key={idx} className="border rounded-lg px-2 py-1">
                                    <span className="text-gray-500 mr-2">{formatDate(n.at)}</span>
                                    <b className="mr-2">{n.by}</b>
                                    {n.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-3 py-1 border rounded" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </button>
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <button className="px-3 py-1 border rounded" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  function exportCSV() {
    const headers = [
      "ID",
      "Type",
      "Lesson",
      "StudentName",
      "StudentEmail",
      "TutorName",
      "TutorEmail",
      "Amount",
      "Currency",
      "Status",
      "Reason",
      "CreatedAt",
      "NotesCount",
    ];
    const lines = [headers.map(csvEscape).join(",")];
    filteredSorted.forEach((d) => {
      const row = [
        d.id,
        d.type,
        d.lessonId,
        d.student?.name,
        d.student?.email,
        d.tutor?.name,
        d.tutor?.email,
        typeof d.amount === "number" ? d.amount.toFixed(2) : "",
        d.currency || "",
        d.status || "",
        (d.reason || "").replace(/\n/g, " "),
        d.createdAt || "",
        Array.isArray(d.notes) ? d.notes.length : 0,
      ];
      lines.push(row.map(csvEscape).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disputes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
