// client/src/pages/admin/tabs/UsersTab.jsx
// ----------------------------------------------------------------------------
// USERS ADMIN TAB (Lernitt) — VITE_MOCK aware
// ----------------------------------------------------------------------------
// Goals
// - Preserve ALL existing features from your previous UsersTab.
// - Add XLSX export next to CSV (mock-safe with dynamic import).
// - Add JSON export (nice for quick audits).
// - Add date-range filters (createdAt / lastActive).
// - Add column visibility toggles (persisted).
// - Add selection helpers (Select page / Select all / Clear).
// - Add richer KPI/Summary (per-role, per-status, averages).
// - Add optional notes per user (mock/local only) with audit trail.
// - Persist filters & sort to localStorage (stable between reloads).
// - Strictly no external component dependencies beyond your shim.
// - Clean, defensive code that works in VITE_MOCK=1 and live mode.
// ----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import AdminTable from "./AdminTableShim.jsx";

// ---------------------------------------------------------------------------
// ENV + FLAGS
// ---------------------------------------------------------------------------
const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

// Local persistence keys (namespaced)
const NS = "usersTab:v1:";
const K_FILTERS = NS + "filters";
const K_SORT = NS + "sort";
const K_COLS = NS + "columns";
const K_NOTES = NS + "notes"; // per-user local notes (mock-friendly)

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Convert unknown to number (default 0)
 * @param {any} v
 * @returns {number}
 */
function toNum(v) {
  return typeof v === "number" ? v : Number(v || 0);
}

/**
 * Two decimals formatter
 * @param {any} v
 * @returns {string}
 */
function fmt2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

/**
 * Safe JSON.parse wrapper
 * @param {string} s
 * @param {any} fallback
 * @returns {any}
 */
function tryParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

/**
 * Persist to localStorage
 */
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function loadLS(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

/**
 * Friendly date label
 */
function fmtDateLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

// ---------------------------------------------------------------------------
// Safe fetch with JWT + extensive MOCK support
// ---------------------------------------------------------------------------
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

    // ---------------- MOCK ENDPOINTS ----------------
    const isGET = !opts.method || opts.method === "GET";

    // GET users list
    if (url.endsWith("/api/admin/users") && isGET) {
      // We allow some growth by reusing persisted mock notes here
      const notesMap = loadLS(K_NOTES, {});
      return {
        items: [
          {
            id: "u1",
            name: "Alice Student",
            email: "alice@example.com",
            role: "student",
            status: "active",
            verified: true,
            lessonsCount: 14,
            spent: 265.5,
            locale: "en-US",
            createdAt: "2025-08-30T12:10:00Z",
            lastActive: "2025-09-30T09:00:00Z",
            notes: notesMap["u1"] || [],
          },
          {
            id: "u2",
            name: "Bob Tutor",
            email: "bob@example.com",
            role: "tutor",
            status: "active",
            verified: true,
            lessonsCount: 312,
            spent: 0,
            locale: "en-GB",
            createdAt: "2025-06-10T08:00:00Z",
            lastActive: "2025-09-30T10:20:00Z",
            notes: notesMap["u2"] || [],
          },
          {
            id: "u3",
            name: "Cara Learner",
            email: "cara@example.com",
            role: "student",
            status: "suspended",
            verified: false,
            lessonsCount: 3,
            spent: 45,
            locale: "fr-FR",
            createdAt: "2025-09-20T18:30:00Z",
            lastActive: "2025-09-25T17:00:00Z",
            notes: notesMap["u3"] || [],
          },
        ],
      };
    }

    // POST: change role / suspend / unsuspend / verify / add-note
    if (url.includes("/api/admin/users/")) {
      // When adding a note: /api/admin/users/:id/note
      if (url.endsWith("/note") && opts.method === "POST") {
        const body = opts?.body ? tryParse(opts.body, {}) : {};
        const id = url.split("/api/admin/users/")[1].split("/")[0];
        const all = loadLS(K_NOTES, {});
        const list = Array.isArray(all[id]) ? all[id] : [];
        const note = {
          by: "admin",
          at: new Date().toISOString(),
          text: String(body?.text || "").slice(0, 2000),
        };
        const next = { ...all, [id]: [...list, note] };
        saveLS(K_NOTES, next);
        return { ok: true, note };
      }
      return { ok: true };
    }

    // Default ok
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// Column visibility (persisted)
// ---------------------------------------------------------------------------
const DEFAULT_COLS = [
  "name",
  "email",
  "role",
  "status",
  "verified",
  "lessonsCount",
  "spent",
  "locale",
  "createdAt",
  "lastActive",
  "actions",
];

// small UI helpers (no external libs)
// ---------------------------------------------------------------------------
function SectionTitle({ children }) {
  return <h3 className="font-semibold mb-2">{children}</h3>;
}

function StatCard({ label, value, extra }) {
  return (
    <div className="bg-white border rounded-2xl p-3 text-center">
      <div className="font-semibold">{label}</div>
      <div className="text-lg">{value}</div>
      {extra ? <div className="text-xs text-gray-500">{extra}</div> : null}
    </div>
  );
}

function Pill({ children, tone = "gray" }) {
  const toneMap = {
    green: "bg-green-50 border-green-200 text-green-900",
    red: "bg-red-50 border-red-200 text-red-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    gray: "bg-gray-50 border-gray-200 text-gray-900",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full border ${toneMap[tone] || toneMap.gray}`}>
      {children}
    </span>
  );
}

function Divider() {
  return <hr className="my-3 border-gray-200" />;
}

// ---------------------------------------------------------------------------
// Column Toggle UI
// ---------------------------------------------------------------------------
function ColumnToggle({ columns, setColumns }) {
  return (
    <details className="bg-white border rounded-2xl p-3">
      <summary className="cursor-pointer select-none">Columns</summary>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
        {DEFAULT_COLS.map((key) => {
          const label = {
            name: "Name",
            email: "Email",
            role: "Role",
            status: "Status",
            verified: "Verified",
            lessonsCount: "Lessons",
            spent: "Spent",
            locale: "Locale",
            createdAt: "Created",
            lastActive: "Last Active",
            actions: "Actions",
          }[key];
          return (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={columns.includes(key)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...new Set([...columns, key])]
                    : columns.filter((c) => c !== key);
                  setColumns(next);
                  saveLS(K_COLS, next);
                }}
              />
              {label || key}
            </label>
          );
        })}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Notes UI (mock/local) — stored in localStorage
// ---------------------------------------------------------------------------
function NotesList({ userId, items, onAdd }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2">
      <SectionTitle>Notes</SectionTitle>
      {(!items || !items.length) && (
        <div className="text-xs text-gray-500 mb-1">No notes yet.</div>
      )}
      <ul className="space-y-1">
        {(items || []).map((n, idx) => (
          <li
            key={idx}
            className="border rounded-lg px-2 py-1 text-sm flex items-start justify-between gap-2"
          >
            <div>
              <span className="text-gray-500 mr-2">{fmtDateLabel(n.at)}</span>
              <b className="mr-1">{n.by}</b>
              {n.text}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className="border rounded-lg px-2 py-1 flex-1 text-sm"
          placeholder="Add note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="px-2 py-1 border rounded"
          onClick={() => {
            const t = text.trim();
            if (!t) return;
            onAdd(userId, t);
            setText("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header Sort Button
// ---------------------------------------------------------------------------
function SortHeader({ current, setSort, colKey, label }) {
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
      {current.key === colKey ? (current.dir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export default function UsersTab({ rows = [], columns = [], ...rest }) {
  // Preserve passthrough behavior to AdminTable if external rows/columns provided
  const hasExternal = Array.isArray(rows) && rows.length && Array.isArray(columns) && columns.length;
  if (hasExternal) {
    return <AdminTable rows={rows} columns={columns} {...rest} />;
  }

  // ---------------- Core State ----------------
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Selection + pagination + sort
  const [selected, setSelected] = useState([]); // user IDs
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Sort (persist)
  const [sort, setSort] = useState(() => loadLS(K_SORT, { key: "createdAt", dir: "desc" }));
  useEffect(() => {
    saveLS(K_SORT, sort);
  }, [sort]);

  // Filters (persist)
  const [filters, setFilters] = useState(() =>
    loadLS(K_FILTERS, {
      q: "",
      role: "",
      status: "",
      verified: "",
      locale: "",
      minLessons: "",
      minSpent: "",
      createdFrom: "",
      createdTo: "",
      activeFrom: "",
      activeTo: "",
    })
  );

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    saveLS(K_FILTERS, filters);
  }, [filters]);

  // Column visibility (persist)
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = loadLS(K_COLS, null);
    if (Array.isArray(saved) && saved.length) return saved;
    return DEFAULT_COLS;
  });

  // Row expansion ID
  const [expanded, setExpanded] = useState(null);

  // ---------------- Data Loading ----------------
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await safeFetchJSON(`${API}/api/admin/users`);
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(arr);
    } catch (e) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Row Mutations ----------------
  async function changeRole(id, nextRole) {
    if (!nextRole) return;
    if (IS_MOCK) {
      setItems((xs) => xs.map((u) => (u.id === id ? { ...u, role: nextRole } : u)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: nextRole }),
    });
    setItems((xs) => xs.map((u) => (u.id === id ? { ...u, role: nextRole } : u)));
  }

  async function suspendUser(id) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((u) => (u.id === id ? { ...u, status: "suspended" } : u)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/users/${id}/suspend`, { method: "POST" });
    setItems((xs) => xs.map((u) => (u.id === id ? { ...u, status: "suspended" } : u)));
  }

  async function unsuspendUser(id) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((u) => (u.id === id ? { ...u, status: "active" } : u)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/users/${id}/unsuspend`, { method: "POST" });
    setItems((xs) => xs.map((u) => (u.id === id ? { ...u, status: "active" } : u)));
  }

  async function verifyUser(id) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((u) => (u.id === id ? { ...u, verified: true } : u)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/users/${id}/verify`, { method: "POST" });
    setItems((xs) => xs.map((u) => (u.id === id ? { ...u, verified: true } : u)));
  }

  async function addUserNote(id, text) {
    // local + mock friendly
    try {
      await safeFetchJSON(`${API}/api/admin/users/${id}/note`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
    } catch {
      // ignore if live fails; we still add locally under mock
    }
    setItems((xs) =>
      xs.map((u) =>
        u.id === id
          ? {
              ...u,
              notes: [...(u.notes || []), { by: "admin", at: new Date().toISOString(), text }],
            }
          : u
      )
    );
    // keep LS mirror for mocks
    const all = loadLS(K_NOTES, {});
    const list = Array.isArray(all[id]) ? all[id] : [];
    const note = { by: "admin", at: new Date().toISOString(), text };
    saveLS(K_NOTES, { ...all, [id]: [...list, note] });
  }

  // ---------------- Bulk Ops ----------------
  async function bulkSuspend() {
    for (const id of selected) await suspendUser(id);
    setSelected([]);
  }
  async function bulkUnsuspend() {
    for (const id of selected) await unsuspendUser(id);
    setSelected([]);
  }
  async function bulkVerify() {
    for (const id of selected) await verifyUser(id);
    setSelected([]);
  }
  async function bulkRole(nextRole) {
    if (!nextRole) return;
    for (const id of selected) await changeRole(id, nextRole);
    setSelected([]);
  }

  // ---------------- Derived Lists ----------------
  const locales = useMemo(
    () => Array.from(new Set(items.map((u) => u.locale).filter(Boolean))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const {
      q,
      role,
      status,
      verified,
      locale,
      minLessons,
      minSpent,
      createdFrom,
      createdTo,
      activeFrom,
      activeTo,
    } = filters;

    let arr = items;

    // text query
    const qq = q.trim().toLowerCase();
    if (qq) {
      arr = arr.filter((u) => JSON.stringify(u).toLowerCase().includes(qq));
    }

    // basic filters
    if (role) arr = arr.filter((u) => (u.role || "") === role);
    if (status) arr = arr.filter((u) => (u.status || "") === status);
    if (verified) arr = arr.filter((u) => (u.verified ? "yes" : "no") === verified);
    if (locale) arr = arr.filter((u) => (u.locale || "") === locale);

    // numeric mins
    if (minLessons) arr = arr.filter((u) => toNum(u.lessonsCount) >= toNum(minLessons));
    if (minSpent) arr = arr.filter((u) => toNum(u.spent) >= toNum(minSpent));

    // date ranges
    if (createdFrom) arr = arr.filter((u) => new Date(u.createdAt) >= new Date(createdFrom));
    if (createdTo)
      arr = arr.filter((u) => new Date(u.createdAt) <= new Date(createdTo + "T23:59:59Z"));
    if (activeFrom) arr = arr.filter((u) => new Date(u.lastActive) >= new Date(activeFrom));
    if (activeTo)
      arr = arr.filter((u) => new Date(u.lastActive) <= new Date(activeTo + "T23:59:59Z"));

    return arr;
  }, [items, filters]);

  const sorted = useMemo(() => {
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (sort.key.endsWith("At") || sort.key.toLowerCase().includes("date")) {
        return (new Date(va) - new Date(vb)) * dir;
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

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  // ---------------- KPI / Summary ----------------
  const kpi = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((u) => u.status === "active").length;
    const suspended = filtered.filter((u) => u.status === "suspended").length;
    const verifiedCount = filtered.filter((u) => u.verified).length;
    const lessons = filtered.reduce((s, u) => s + toNum(u.lessonsCount), 0);
    const spent = filtered.reduce((s, u) => s + toNum(u.spent), 0);
    const avgLessons = total ? (lessons / total).toFixed(1) : "0";
    const roles = filtered.reduce(
      (acc, u) => {
        const r = u.role || "unknown";
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      },
      { student: 0, tutor: 0, admin: 0 }
    );
    const statuses = filtered.reduce(
      (acc, u) => {
        const s = u.status || "unknown";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { active: 0, suspended: 0 }
    );
    return { total, active, suspended, verified: verifiedCount, lessons, spent, avgLessons, roles, statuses };
  }, [filtered]);

  // ---------------- Exports ----------------
  function exportCSV(all = false) {
    const base = all ? items : sorted;
    const csv = [
      [
        "ID",
        "Name",
        "Email",
        "Role",
        "Status",
        "Verified",
        "Lessons",
        "Spent",
        "Locale",
        "CreatedAt",
        "LastActive",
      ],
      ...base.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.verified ? "yes" : "no",
        u.lessonsCount ?? 0,
        fmt2(u.spent ?? 0),
        u.locale ?? "",
        u.createdAt ?? "",
        u.lastActive ?? "",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = all ? "users_all.csv" : "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX(all = false) {
    const x = await import("xlsx");
    const XLSX = x.default || x;
    const base = all ? items : sorted;
    const rows = [
      ["ID", "Name", "Email", "Role", "Status", "Verified", "Lessons", "Spent", "Locale", "CreatedAt", "LastActive"],
      ...base.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.verified ? "yes" : "no",
        u.lessonsCount ?? 0,
        Number(fmt2(u.spent ?? 0)),
        u.locale ?? "",
        u.createdAt ?? "",
        u.lastActive ?? "",
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Users");
    XLSX.writeFile(wb, all ? "users_all.xlsx" : "users.xlsx");
  }

  function exportJSON(all = false) {
    const base = all ? items : sorted;
    const blob = new Blob([JSON.stringify(base, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = all ? "users_all.json" : "users.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------- Selection Helpers ----------------
  function selectPage() {
    setSelected(Array.from(new Set(paged.map((r) => r.id))));
  }
  function selectAllResults() {
    setSelected(Array.from(new Set(sorted.map((r) => r.id))));
  }
  function clearSelection() {
    setSelected([]);
  }

  // ---------------- UI: Filters Panel ----------------
  function FiltersCard() {
    return (
      <div className="bg-white border rounded-2xl p-4">
        <SectionTitle>Filters</SectionTitle>

        <input
          className="border rounded px-2 py-1 w-full mb-2"
          placeholder="Search users…"
          value={filters.q}
          onChange={(e) => setFilter("q", e.target.value)}
        />

        <select
          className="border rounded px-2 py-1 w-full mb-2"
          value={filters.role}
          onChange={(e) => setFilter("role", e.target.value)}
        >
          <option value="">All roles</option>
          <option value="student">student</option>
          <option value="tutor">tutor</option>
          <option value="admin">admin</option>
        </select>

        <select
          className="border rounded px-2 py-1 w-full mb-2"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All status</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-sm">
            Verified
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.verified}
              onChange={(e) => setFilter("verified", e.target.value)}
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="text-sm">
            Locale
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.locale}
              onChange={(e) => setFilter("locale", e.target.value)}
            >
              <option value="">Any</option>
              {locales.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-sm">
            Min lessons
            <input
              type="number"
              className="border rounded px-2 py-1 w-full"
              value={filters.minLessons}
              onChange={(e) => setFilter("minLessons", e.target.value)}
            />
          </label>

          <label className="text-sm">
            Min spent ($)
            <input
              type="number"
              className="border rounded px-2 py-1 w-full"
              value={filters.minSpent}
              onChange={(e) => setFilter("minSpent", e.target.value)}
            />
          </label>
        </div>

        {/* Date ranges */}
        <Divider />
        <SectionTitle>Date ranges</SectionTitle>

        <label className="text-xs text-gray-600">Created Between</label>
        <div className="flex gap-2 mb-2">
          <input
            type="date"
            className="border rounded px-2 py-1 flex-1"
            value={filters.createdFrom}
            onChange={(e) => setFilter("createdFrom", e.target.value)}
          />
          <input
            type="date"
            className="border rounded px-2 py-1 flex-1"
            value={filters.createdTo}
            onChange={(e) => setFilter("createdTo", e.target.value)}
          />
        </div>

        <label className="text-xs text-gray-600">Last Active Between</label>
        <div className="flex gap-2 mb-2">
          <input
            type="date"
            className="border rounded px-2 py-1 flex-1"
            value={filters.activeFrom}
            onChange={(e) => setFilter("activeFrom", e.target.value)}
          />
          <input
            type="date"
            className="border rounded px-2 py-1 flex-1"
            value={filters.activeTo}
            onChange={(e) => setFilter("activeTo", e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1 border rounded"
            onClick={() =>
              setFilters({
                q: "",
                role: "",
                status: "",
                verified: "",
                locale: "",
                minLessons: "",
                minSpent: "",
                createdFrom: "",
                createdTo: "",
                activeFrom: "",
                activeTo: "",
              })
            }
          >
            Clear
          </button>
          <button className="px-3 py-1 border rounded" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Reload"}
          </button>
        </div>

        <Divider />
        <ColumnToggle columns={visibleCols} setColumns={setVisibleCols} />
      </div>
    );
  }

  // ---------------- UI: Toolbar ----------------
  function Toolbar() {
    return (
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button className="px-3 py-1 border rounded" onClick={bulkSuspend} disabled={!selected.length}>
          Bulk Suspend
        </button>
        <button className="px-3 py-1 border rounded" onClick={bulkUnsuspend} disabled={!selected.length}>
          Bulk Unsuspend
        </button>
        <button className="px-3 py-1 border rounded" onClick={bulkVerify} disabled={!selected.length}>
          Bulk Verify
        </button>

        <div className="flex items-center gap-1">
          <span className="text-sm">Bulk role:</span>
          <select
            className="border rounded px-2 py-1"
            onChange={(e) => e.target.value && bulkRole(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Choose…
            </option>
            <option value="student">student</option>
            <option value="tutor">tutor</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <button className="px-3 py-1 border rounded ml-auto" onClick={() => exportCSV(false)}>
          Export CSV
        </button>
        <button className="px-3 py-1 border rounded" onClick={() => exportXLSX(false)}>
          Export XLSX
        </button>
        <button className="px-3 py-1 border rounded" onClick={() => exportJSON(false)}>
          Export JSON
        </button>

        <details className="ml-2">
          <summary className="cursor-pointer select-none text-sm underline">More export</summary>
          <div className="mt-1 flex gap-2">
            <button className="px-2 py-1 border rounded text-xs" onClick={() => exportCSV(true)}>
              All CSV
            </button>
            <button className="px-2 py-1 border rounded text-xs" onClick={() => exportXLSX(true)}>
              All XLSX
            </button>
            <button className="px-2 py-1 border rounded text-xs" onClick={() => exportJSON(true)}>
              All JSON
            </button>
          </div>
        </details>
      </div>
    );
  }

  // ---------------- UI: Table ----------------
  function UsersTable() {
    return (
      <div className="overflow-auto border rounded-2xl">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : paged.length === 0 ? (
          <div className="p-4 text-gray-600">{err || "No users found."}</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border-b">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && selected.length === paged.length}
                    onChange={(e) => setSelected(e.target.checked ? paged.map((u) => u.id) : [])}
                    aria-label="Select all on page"
                  />
                </th>

                {visibleCols.includes("name") && (
                  <th className="px-3 py-2 border-b text-left">
                    <SortHeader current={sort} setSort={setSort} colKey="name" label="Name" />
                  </th>
                )}

                {visibleCols.includes("email") && (
                  <th className="px-3 py-2 border-b text-left">
                    <SortHeader current={sort} setSort={setSort} colKey="email" label="Email" />
                  </th>
                )}

                {visibleCols.includes("role") && (
                  <th className="px-3 py-2 border-b text-left">
                    <SortHeader current={sort} setSort={setSort} colKey="role" label="Role" />
                  </th>
                )}

                {visibleCols.includes("status") && (
                  <th className="px-3 py-2 border-b text-left">
                    <SortHeader current={sort} setSort={setSort} colKey="status" label="Status" />
                  </th>
                )}

                {visibleCols.includes("verified") && (
                  <th className="px-3 py-2 border-b text-left">Verified</th>
                )}

                {visibleCols.includes("lessonsCount") && (
                  <th className="px-3 py-2 border-b text-right">
                    <SortHeader
                      current={sort}
                      setSort={setSort}
                      colKey="lessonsCount"
                      label="Lessons"
                    />
                  </th>
                )}

                {visibleCols.includes("spent") && (
                  <th className="px-3 py-2 border-b text-right">
                    <SortHeader current={sort} setSort={setSort} colKey="spent" label="Spent ($)" />
                  </th>
                )}

                {visibleCols.includes("locale") && (
                  <th className="px-3 py-2 border-b text-left">
                    <SortHeader current={sort} setSort={setSort} colKey="locale" label="Locale" />
                  </th>
                )}

                {visibleCols.includes("createdAt") && (
                  <th className="px-3 py-2 border-b text-left">
                    <SortHeader
                      current={sort}
                      setSort={setSort}
                      colKey="createdAt"
                      label="Created"
                    />
                  </th>
                )}

                {visibleCols.includes("lastActive") && (
                  <th className="px-3 py-2 border-b text-left">
                    <SortHeader
                      current={sort}
                      setSort={setSort}
                      colKey="lastActive"
                      label="Last Active"
                    />
                  </th>
                )}

                {visibleCols.includes("actions") && <th className="px-3 py-2 border-b">Actions</th>}
              </tr>
            </thead>

            <tbody>
              {paged.map((u) => (
                <tr key={u.id} className="border-t align-top">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked ? [...new Set([...s, u.id])] : s.filter((x) => x !== u.id)
                        )
                      }
                      aria-label={`Select ${u.name}`}
                    />
                  </td>

                  {visibleCols.includes("name") && <td className="px-3 py-2">{u.name}</td>}

                  {visibleCols.includes("email") && <td className="px-3 py-2">{u.email}</td>}

                  {visibleCols.includes("role") && <td className="px-3 py-2">{u.role}</td>}

                  {visibleCols.includes("status") && (
                    <td className="px-3 py-2">
                      <Pill tone={u.status === "active" ? "green" : u.status === "suspended" ? "red" : "gray"}>
                        {u.status}
                      </Pill>
                    </td>
                  )}

                  {visibleCols.includes("verified") && (
                    <td className="px-3 py-2">{u.verified ? "yes" : "no"}</td>
                  )}

                  {visibleCols.includes("lessonsCount") && (
                    <td className="px-3 py-2 text-right">{u.lessonsCount ?? 0}</td>
                  )}

                  {visibleCols.includes("spent") && (
                    <td className="px-3 py-2 text-right">${fmt2(u.spent ?? 0)}</td>
                  )}

                  {visibleCols.includes("locale") && <td className="px-3 py-2">{u.locale || "—"}</td>}

                  {visibleCols.includes("createdAt") && (
                    <td className="px-3 py-2 text-xs">{fmtDateLabel(u.createdAt)}</td>
                  )}

                  {visibleCols.includes("lastActive") && (
                    <td className="px-3 py-2 text-xs">{fmtDateLabel(u.lastActive)}</td>
                  )}

                  {visibleCols.includes("actions") && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={() => {
                            const nextRole = prompt("Set role (student/tutor/admin)", u.role || "student");
                            if (nextRole) changeRole(u.id, nextRole);
                          }}
                        >
                          Set Role
                        </button>
                        {u.status !== "suspended" ? (
                          <button className="px-2 py-1 border rounded" onClick={() => suspendUser(u.id)}>
                            Suspend
                          </button>
                        ) : (
                          <button className="px-2 py-1 border rounded" onClick={() => unsuspendUser(u.id)}>
                            Unsuspend
                          </button>
                        )}
                        {!u.verified && (
                          <button className="px-2 py-1 border rounded" onClick={() => verifyUser(u.id)}>
                            Verify
                          </button>
                        )}
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                        >
                          {expanded === u.id ? "Hide" : "Details"}
                        </button>
                      </div>

                      {expanded === u.id && (
                        <div className="mt-2 text-xs text-gray-700 border-t pt-2">
                          <div className="grid grid-cols-2 gap-y-1">
                            <div><b>ID:</b> {u.id}</div>
                            <div><b>Verified:</b> {u.verified ? "yes" : "no"}</div>
                            <div><b>Created:</b> {fmtDateLabel(u.createdAt)}</div>
                            <div><b>Last Active:</b> {fmtDateLabel(u.lastActive)}</div>
                            <div><b>Lessons:</b> {u.lessonsCount ?? 0}</div>
                            <div><b>Spent:</b> ${fmt2(u.spent ?? 0)}</div>
                          </div>

                          {/* Notes */}
                          <NotesList userId={u.id} items={u.notes} onAdd={addUserNote} />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // ---------------- Render ----------------
  return (
    <div className="p-4 space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total" value={kpi.total} />
        <StatCard label="Active" value={kpi.active} />
        <StatCard label="Suspended" value={kpi.suspended} />
        <StatCard label="Verified" value={kpi.verified} />
        <StatCard label="Avg Lessons" value={kpi.avgLessons} />
        <StatCard label="Total Spent" value={`$${fmt2(kpi.spent)}`} />
      </div>

      {/* Role / Status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-4">
          <SectionTitle>By Role</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">students: {kpi.roles.student || 0}</Pill>
            <Pill tone="blue">tutors: {kpi.roles.tutor || 0}</Pill>
            <Pill tone="blue">admins: {kpi.roles.admin || 0}</Pill>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <SectionTitle>By Status</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Pill tone="green">active: {kpi.statuses.active || 0}</Pill>
            <Pill tone="red">suspended: {kpi.statuses.suspended || 0}</Pill>
          </div>
        </div>
      </div>

      {/* Layout: Filters / Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <FiltersCard />
        </div>

        <div className="lg:col-span-2">
          <Toolbar />

          {/* Selection helpers */}
          <div className="flex flex-wrap gap-2 mb-3">
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
              Selected {selected.length} / {sorted.length}
            </span>
          </div>

          <UsersTable />

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
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
