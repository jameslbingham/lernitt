// client/src/pages/AdminDashboard.jsx
// =====================================================================================================================
// LERNITT — ADMIN DASHBOARD (MOCK + REAL READY)
// ---------------------------------------------------------------------------------------------------------------------
// This file preserves ALL previously delivered features and merges in Support tab wiring (UI + routing behaviors).
// It is intentionally verbose and heavily commented to be future-proof and easy to extend.
//
// INCLUDED TABS & FEATURES
// • Users: role change, suspend/unsuspend, verify/unverify, search/filter/sort/export, bulk select, column toggle,
//   pagination, details drawer, saved per-tab prefs.
// • Tutors: approval queue (approve/reject), search/filter/sort/export, bulk select, column toggle,
//   pagination, details drawer, saved per-tab prefs.
// • Lessons: reschedule approve/deny (server PATCH stub ready), trial-usage badges, search/filter/sort/export,
//   column toggle, pagination, details drawer, saved per-tab prefs.
// • Payouts: list with filters, bulk actions placeholder, search/filter/sort/export,
//   column toggle, pagination, details drawer, saved per-tab prefs.
// • Refunds: list with filters, bulk actions placeholder, search/filter/sort/export,
//   column toggle, pagination, details drawer, saved per-tab prefs.
// • Notifications: list + admin tools (broadcast/custom/delete/resend) with stubs,
//   search/filter/sort/export, column toggle, pagination, details drawer, saved per-tab prefs.
// • Disputes: list + resolve/reject actions (server PATCH stub ready), search/filter/sort/export,
//   column toggle, pagination, details drawer, saved per-tab prefs.
// • Support: NEW tab (rendered by ./admin/tabs/Support.jsx) — wired in here (no list fetch since it’s self-contained).
// • Finance: separate dashboard rendered by ./admin/tabs/Finance.jsx (mock+real ready).
//
// CORE CAPABILITIES
// • VITE_MOCK=1 friendly: Rich mock fallbacks in getJSON keep UI functioning without backend
// • Real-mode ready: Uses real endpoints when they exist; new stubs prevent "route not found" in real mode
// • Admin overrides persistence: localStorage-backed overrides to simulate persistence while mocking
// • CSV export: Exports current filtered+sorted rows
// • Table utilities: selection, sorting, simple per-tab column filters
// • Quality of life: column visibility toggles, saved per-tab table preferences, quick stats, details drawer,
//   sticky controls, keyboard shortcuts (optional), inline badges
//
// NOTE: This is a single file to keep copy/paste simple for now. In production you might split into smaller files.
// =====================================================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams, useParams } from "react-router-dom";
import Finance from "./admin/tabs/Finance.jsx";
import Support from "./admin/tabs/Support.jsx"; // ← Support tab
import { Badge } from "./admin/common/Badges.jsx";      // ← externalized
import { Btn } from "./admin/common/Buttons.jsx";       // ← externalized
import { Input, Select, Textarea } from "./admin/common/Inputs.jsx"; // ← externalized
import Collapsible from "./admin/common/Collapsible.jsx";            // ← externalized
import { useConfirm } from "./admin/common/Confirm.jsx";             // ← externalized
import AdminTable from "./admin/common/AdminTable.jsx";              // ← modular-ready (kept import)
// ====== NEW IMPORTS (dashboards) =============================================================================
import FinancialsDashboard from "./admin/tabs/FinancialsDashboard.jsx";
import RiskOpsDashboard from "./admin/tabs/RiskOpsDashboard.jsx";
import GrowthDashboard from "./admin/tabs/GrowthDashboard.jsx";

// ✅ Use shared safe fetch
import { safeFetchJSON } from "@/lib/safeFetch.js";
// ✅ XLSX export helper (for Export XLSX button)
import { exportTableToXLSX } from "@/lib/adminExports.js";

// ===================================================================================================================

/* =====================================================================================================================
   0) SMALL UI BUILDING BLOCKS
   ===================================================================================================================== */

/** Join CSS class strings safely. */
function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* =====================================================================================================================
   1) ADMIN OVERRIDES PERSISTENCE (mock-mode local storage)
   ===================================================================================================================== */

const OVERRIDES_KEY = "adminDashboard.overrides.v1";

/** Initialize the override shape for all resource groups. */
function initOverridesShape() {
  // EXTENDED: includes disputes to preserve admin decisions in mock mode.
  return {
    users: {},
    tutors: {},
    lessons: {},
    payouts: {},
    refunds: {},
    notifications: {},
    disputes: {},
  };
}

/** Load existing overrides from localStorage if present and valid. */
function loadOverrides() {
  try {
    const o = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "null");
    return o && typeof o === "object" ? { ...initOverridesShape(), ...o } : initOverridesShape();
  } catch {
    return initOverridesShape();
  }
}

/** Save the provided overrides object into localStorage. */
function saveOverrides(o) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
}

/** Normalize a human tab label into the overrides bucket key. */
function tabKey(tab) {
  if (tab === "Users") return "users";
  if (tab === "Tutors") return "tutors";
  if (tab === "Lessons") return "lessons";
  if (tab === "Payouts") return "payouts";
  if (tab === "Refunds") return "refunds";
  if (tab === "Notifications") return "notifications";
  if (tab === "Disputes") return "disputes";
  return "users";
}

/** Merge any saved overrides into freshly-fetched rows. */
function applyOverrides(tab, items) {
  const key = tabKey(tab);
  const ov = loadOverrides();
  return items.map((r) => ({ ...r, ...(ov[key]?.[r.id] || {}) }));
}

/**
 * Save an override and update current rows in-place.
 * @param {string} tab - current tab name
 * @param {string} id  - row id
 * @param {object} patch - fields to override (e.g., { suspended: true })
 * @param {function} setRows - React setState for rows
 */
function updateRowOverride(tab, id, patch, setRows) {
  const key = tabKey(tab);
  const ov = loadOverrides();
  ov[key][id] = { ...(ov[key][id] || {}), ...patch };
  saveOverrides(ov);
  setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

/* =====================================================================================================================
   2) DATA FETCH (with robust mock fallbacks)
   ===================================================================================================================== */

async function getJSON(url, opts = {}) {
  try {
    // ✅ UPDATED: use safeFetchJSON instead of fetch
    const data = await safeFetchJSON(url, opts);
    if (data === null) throw new Error("HTTP error or invalid JSON");
    return data;
  } catch {
    // (MOCK FALLBACKS)
    if (url === "/api/admin/users") {
      return {
        items: [
          { id: "u1", name: "Alice Student", email: "alice@example.com", role: "student", verified: false, suspended: false },
          { id: "u2", name: "Bob Tutor", email: "bob@example.com", role: "tutor", verified: true, suspended: false },
          { id: "u3", name: "Admin", email: "admin@example.com", role: "admin", verified: true, suspended: false },
        ],
      };
    }
    if (url === "/api/tutors") {
      return {
        items: [
          { id: "t1", name: "Bob Tutor", subject: "English", price: 25, rating: 4.8, status: "approved" },
          { id: "t2", name: "Jane Tutor", subject: "Spanish", price: 20, rating: 4.5, status: "pending" },
        ],
      };
    }
    if (url === "/api/lessons") {
      return {
        items: [
          {
            id: "L1",
            student: "Alice",
            studentId: "u1",
            tutor: "Bob Tutor",
            start: "2025-10-02T12:00:00Z",
            duration: 60,
            status: "booked",
            rescheduleRequested: true,
            studentTrialCount: 1,
            studentTrialLimit: 1,
          },
          {
            id: "L2",
            student: "Alice",
            studentId: "u1",
            tutor: "Jane Tutor",
            start: "2025-10-05T09:00:00Z",
            duration: 30,
            status: "trial",
            rescheduleRequested: false,
            studentTrialCount: 0,
            studentTrialLimit: 1,
          },
          {
            id: "L3",
            student: "Charlie",
            studentId: "u4",
            tutor: "Bob Tutor",
            start: "2025-10-06T15:30:00Z",
            duration: 45,
            status: "booked",
            rescheduleRequested: false,
            studentTrialCount: 2,
            studentTrialLimit: 1,
          },
        ],
      };
    }
    if (url === "/api/payouts") {
      return {
        items: [
          { id: "P1", tutor: "Bob Tutor", method: "Stripe", amount: 62.5, currency: "EUR", status: "queued", createdAt: "2025-09-29T09:15:00Z" },
          { id: "P2", tutor: "Jane Tutor", method: "PayPal", amount: 120, currency: "USD", status: "paid", createdAt: "2025-09-27T16:40:00Z" },
        ],
      };
    }
    if (url === "/api/refunds") {
      return {
        items: [
          { id: "R1", student: "Alice", tutor: "Bob Tutor", lessonId: "L1", amount: 25, currency: "EUR", reason: "Student canceled within policy", status: "processed", createdAt: "2025-09-26T11:00:00Z" },
          { id: "R2", student: "Charlie", tutor: "Jane Tutor", lessonId: "L3", amount: 20, currency: "USD", reason: "No-show", status: "queued", createdAt: "2025-09-28T08:30:00Z" },
        ],
      };
    }
    if (url === "/api/notifications") {
      return {
        items: [
          { id: "N1", userId: "u2", type: "payout.queued", title: "Payout queued", message: "€62.50 payout queued to Stripe.", read: false, createdAt: "2025-09-29T09:16:00Z" },
          { id: "N2", userId: "u1", type: "lesson.reminder", title: "Lesson reminder", message: "Trial with Bob Tutor starts in 24 hours.", read: true, createdAt: "2025-09-28T12:00:00Z" },
        ],
      };
    }
    if (url === "/api/admin/disputes") {
      return {
        items: [
          {
            id: "D1",
            user: { id: "u1", name: "Alice Student", email: "alice@example.com" },
            lesson: { id: "L1", subject: "English", startTime: "2025-09-30T10:00:00Z", endTime: "2025-09-30T11:00:00Z", status: "completed" },
            reason: "Tutor ended lesson early",
            status: "open",
            createdAt: "2025-09-30T12:00:00Z",
          },
          {
            id: "D2",
            user: { id: "u2", name: "Bob Tutor", email: "bob@example.com" },
            lesson: { id: "L2", subject: "Spanish", startTime: "2025-09-29T15:00:00Z", endTime: "2025-09-29T15:30:00Z", status: "canceled" },
            reason: "Student no-show dispute",
            status: "open",
            createdAt: "2025-09-29T16:00:00Z",
          },
          {
            id: "D3",
            user: { id: "u5", name: "Ella Student", email: "ella@example.com" },
            lesson: { id: "L9", subject: "German", startTime: "2025-09-27T09:00:00Z", endTime: "2025-09-27T10:00:00Z", status: "completed" },
            reason: "Audio issues claim",
            status: "resolved",
            createdAt: "2025-09-27T11:00:00Z",
          },
        ],
      };
    }
    return [];
  }
}

/* =====================================================================================================================
   3) TABLE & VIEW PREFERENCES (optional niceties, persisted)
   ===================================================================================================================== */

const PREFS_KEY = "adminDashboard.prefs.v1";

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}
function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
function getTabPrefs(tab) {
  const p = loadPrefs();
  return p[tab] || {};
}
function setTabPrefs(tab, patch) {
  const p = loadPrefs();
  p[tab] = { ...(p[tab] || {}), ...patch };
  savePrefs(p);
}

/* =====================================================================================================================
   4) TABS
   ===================================================================================================================== */

const TABS = [
  "Users",
  "Tutors",
  "Lessons",
  "Payouts",
  "Refunds",
  "Notifications",
  "Disputes",
  "Support",
  "Finance",
  "Financials",
  "Risk & Ops",
  "Growth",
];

/* =====================================================================================================================
   4.1) ROUTE-DRIVEN TAB RESOLUTION
   ===================================================================================================================== */

const ADMIN_TABS_MAP = {
  users: "Users",
  tutors: "Tutors",
  lessons: "Lessons",
  refunds: "Refunds",
  disputes: "Disputes",
  support: "Support",
  notifications: "Notifications",
  finance: "Finance",
  payouts: "Payouts",
  financials: "Financials",
  "risk & ops": "Risk & Ops",
  growth: "Growth",
};

function resolveAdminTab({ propTab, search, hash, pathname, paramTab }) {
  const candidates = [
    propTab,
    search?.get?.("tab"),
    (hash || "").replace(/^#/, ""),
    paramTab,
    (pathname || "").split("/").filter(Boolean).pop(),
  ];
  for (const c of candidates) {
    const raw = String(c || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (ADMIN_TABS_MAP[key]) return ADMIN_TABS_MAP[key];
    const norm = key.replace(/[-_]/g, " ");
    if (ADMIN_TABS_MAP[norm]) return ADMIN_TABS_MAP[norm];
  }
  return "Users";
}

/* =====================================================================================================================
   5) MAIN COMPONENT
   ===================================================================================================================== */

export default function AdminDashboard({ initialTab = "users" }) {
  const loc = useLocation();
  const [search] = useSearchParams();
  const params = useParams();

  const [tab, setTab] = useState(() =>
    resolveAdminTab({
      propTab: initialTab,
      search,
      hash: loc.hash,
      pathname: loc.pathname,
      paramTab: params?.tab,
    })
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const next = resolveAdminTab({
      propTab: initialTab,
      search,
      hash: loc.hash,
      pathname: loc.pathname,
      paramTab: params?.tab,
    });
    setTab(next);
  }, [initialTab, loc.pathname, loc.hash, search, params?.tab]);

  // UX state
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [filterValue, setFilterValue] = useState("");
  const [selected, setSelected] = useState([]);
  const [detailsRow, setDetailsRow] = useState(null);

  // Notifications admin form state
  const [broadcast, setBroadcast] = useState({ title: "", message: "", audience: "all" });
  const [custom, setCustom] = useState({ title: "", message: "", userIds: "" });
  const [sending, setSending] = useState(false);

  // Table prefs
  const [visibleCols, setVisibleCols] = useState(() => getTabPrefs("Users").visibleCols || []);
  const [pageSize, setPageSize] = useState(() => getTabPrefs("Users").pageSize || 25);
  const [page, setPage] = useState(1);

  const topRef = useRef(null);
  const { confirm, ConfirmUI } = useConfirm();

  // Role gate (mock)
  const isOverride = new URLSearchParams(loc.search).get("admin") === "1";
  const role = isOverride
    ? "admin"
    : (() => {
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          return u?.role || "guest";
        } catch {
          return "guest";
        }
      })();

  // Sync prefs when tab changes
  useEffect(() => {
    const tp = getTabPrefs(tab);
    if (tp.visibleCols) setVisibleCols(tp.visibleCols);
    if (tp.pageSize) setPageSize(tp.pageSize);
    setPage(1);
  }, [tab]);

  // Fetch rows when tab changes
  useEffect(() => {
    // Dashboards/self-contained tabs
    if (tab === "Finance" || tab === "Support" || tab === "Financials" || tab === "Risk & Ops" || tab === "Growth") {
      setLoading(false);
      setRows([]);
      setSelected([]);
      setDetailsRow(null);
      return;
    }

    let url = "";
    if (tab === "Users") url = "/api/admin/users";
    if (tab === "Tutors") url = "/api/tutors";
    if (tab === "Lessons") url = "/api/lessons";
    if (tab === "Payouts") url = "/api/payouts";
    if (tab === "Refunds") url = "/api/refunds";
    if (tab === "Notifications") url = "/api/notifications";
    if (tab === "Disputes") url = "/api/admin/disputes";

    setLoading(true);
    getJSON(url).then((data) => {
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setRows(applyOverrides(tab, arr));
      setLoading(false);
      setSelected([]);
      setDetailsRow(null);
    });
  }, [tab]);

  useEffect(() => {
    setFilterValue("");
    setSort({ key: null, dir: "asc" });
    setSelected([]);
    setQuery("");
  }, [tab]);

  useEffect(() => {
    setSelected([]);
    setPage(1);
  }, [filterValue, query]);

  // Derived: search → filter → sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = !q ? rows : rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));

    if (filterValue) {
      arr = arr.filter((r) => {
        if (tab === "Users") return r.role === filterValue;
        if (tab === "Payouts") return r.status === filterValue;
        if (tab === "Refunds") return r.status === filterValue;
        if (tab === "Disputes") return (r.status || "open") === filterValue;
        return true;
      });
    }

    if (sort.key) {
      const dir = sort.dir === "desc" ? -1 : 1;
      arr = [...arr].sort((a, b) => {
        const av = flatten(a)[sort.key];
        const bv = flatten(b)[sort.key];
        const norm = (v) => {
          if (v == null) return "";
          if (typeof v === "number") return v;
          if (typeof v === "boolean") return v ? 1 : 0;
          return String(v).toLowerCase();
        };
        const A = norm(av), B = norm(bv);
        if (A < B) return -1 * dir;
        if (A > B) return 1 * dir;
        return 0;
      });
    }
    return arr;
  }, [rows, query, filterValue, sort, tab]);

  // Columns / pagination
  const allCols = useMemo(() => (filtered[0] ? Object.keys(flatten(filtered[0])) : []), [filtered]);
  const activeCols = useMemo(() => {
    if (!visibleCols || visibleCols.length === 0) return allCols.slice(0, 8);
    return visibleCols.filter((c) => allCols.includes(c)).slice(0, 10);
  }, [visibleCols, allCols]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Column renderers (used by optional AdminTable)
  const columns = useMemo(() => {
    return activeCols.map((k, idx) => ({
      key: k,
      render: (row) => {
        const flat = flatten(row);
        const val = flat[k];

        if (tab === "Lessons" && k === "status") {
          const isTrial = row.status === "trial";
          const count = Number(row.studentTrialCount ?? 0);
          const limit = row.studentTrialLimit == null ? null : Number(row.studentTrialLimit);
          const over = limit != null ? count > limit : false;
          const atCap = limit != null ? count === limit : false;
          return (
            <div className="space-x-1">
              <Badge color={row.status==="booked"?"blue":row.status==="trial"?"purple":"gray"}>
                {formatCell(val)}
              </Badge>
              {isTrial && (
                <Badge color={over ? "red" : atCap ? "orange" : "green"} title="Trial usage">
                  {`trial ${count}/${limit ?? "∞"}`}
                </Badge>
              )}
            </div>
          );
        }

        if (tab === "Lessons" && k === "rescheduleStatus") {
          return (
            <Badge color={row.rescheduleStatus==="approved"?"green":row.rescheduleStatus==="denied"?"red":"gray"}>
              {formatCell(val)}
            </Badge>
          );
        }

        if (tab === "Lessons" && (row.studentTrialCount != null || row.studentTrialLimit != null) && idx === 0 && k !== "status") {
          const count = Number(row.studentTrialCount ?? 0);
          const limit = row.studentTrialLimit == null ? null : Number(row.studentTrialLimit);
          const over = limit != null ? count > limit : false;
          const atCap = limit != null ? count === limit : false;
          return (
            <div>
              {formatCell(val)}
              <div className="mt-1">
                <Badge color={over ? "red" : atCap ? "orange" : "green"}>
                  {`trial ${count}/${limit ?? "∞"}`}
                </Badge>
              </div>
            </div>
          );
        }

        if (tab === "Disputes" && k === "status") {
          const st = (val || "open");
          const color = st==="resolved" ? "green" : st==="rejected" ? "red" : "yellow";
          return <Badge color={color}>{formatCell(st)}</Badge>;
        }

        return formatCell(val);
      },
    }));
  }, [activeCols, tab]);

  function renderActions(row) {
    return (
      <div className="space-x-1">
        <Btn onClick={() => setDetailsRow(detailsRow?.id === row.id ? null : row)} title="View">
          {detailsRow?.id === row.id ? "Hide" : "View"}
        </Btn>

        {/* Users */}
        {tab === "Users" && (
          <>
            <Select value={row.role} onChange={(e) => handleChangeUserRole(row, e.target.value)} title="Change role" className="text-xs">
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
              <option value="admin">Admin</option>
            </Select>
            <Btn onClick={() => handleToggleSuspend(row)} className="text-xs">
              {row.suspended ? "Unsuspend" : "Suspend"}
            </Btn>
            <Btn onClick={() => handleToggleVerify(row)} className="text-xs">
              {row.verified ? "Unverify" : "Verify"}
            </Btn>
          </>
        )}

        {/* Tutors */}
        {tab === "Tutors" && (
          <>
            {row.status === "pending" && (
              <>
                <Btn onClick={() => handleApproveTutor(row)} className="text-xs" kind="success">Approve</Btn>
                <Btn onClick={() => handleRejectTutor(row)} className="text-xs" kind="danger">Reject</Btn>
              </>
            )}
            {row.status === "approved" && <Badge color="green">Approved</Badge>}
            {row.status === "rejected" && <Badge color="red">Rejected</Badge>}
          </>
        )}

        {/* Lessons */}
        {tab === "Lessons" && row.rescheduleRequested && !row.rescheduleStatus && (
          <>
            <Btn onClick={() => handleReschedule(row, "approved")} className="text-xs" kind="success">Approve</Btn>
            <Btn onClick={() => handleReschedule(row, "denied")} className="text-xs" kind="danger">Deny</Btn>
            <Badge color="yellow">reschedule pending</Badge>
          </>
        )}
        {tab === "Lessons" && row.rescheduleStatus && (
          <Badge color={row.rescheduleStatus === "approved" ? "green" : "red"}>{row.rescheduleStatus}</Badge>
        )}

        {/* Disputes */}
        {tab === "Disputes" && (row.status === "open" || !row.status) && (
          <>
            <Btn onClick={() => handleDisputeStatus(row, "resolved", "Resolved by admin")} className="text-xs" kind="success">Resolve</Btn>
            <Btn onClick={() => handleDisputeStatus(row, "rejected", "Rejected by admin")} className="text-xs" kind="danger">Reject</Btn>
            <Badge color="yellow">open</Badge>
          </>
        )}
        {tab === "Disputes" && row.status && row.status !== "open" && (
          <Badge color={row.status === "resolved" ? "green" : "red"}>{row.status}</Badge>
        )}

        {/* Notifications */}
        {tab === "Notifications" && (
          <>
            <Btn onClick={() => handleResendNotification(row.id)} className="text-xs" kind="info">Resend</Btn>
            <Btn onClick={() => handleDeleteNotification(row.id)} className="text-xs" kind="danger">Delete</Btn>
          </>
        )}
      </div>
    );
  }

  // Users
  function handleChangeUserRole(row, newRole) {
    updateRowOverride("Users", row.id, { role: newRole }, setRows);
  }
  function handleToggleSuspend(row) {
    const next = !row.suspended;
    updateRowOverride("Users", row.id, { suspended: next }, setRows);
  }
  function handleToggleVerify(row) {
    updateRowOverride("Users", row.id, { verified: !row.verified }, setRows);
  }

  // Tutors
  function handleApproveTutor(row) {
    updateRowOverride("Tutors", row.id, { status: "approved" }, setRows);
  }
  function handleRejectTutor(row) {
    updateRowOverride("Tutors", row.id, { status: "rejected" }, setRows);
  }

  // Lessons
  async function handleReschedule(row, status) {
    try {
      await safeFetchJSON(`/api/admin/lessons/${row.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {}
    updateRowOverride("Lessons", row.id, { rescheduleStatus: status }, setRows);
  }

  // Disputes
  async function handleDisputeStatus(row, status, resolution = "") {
    try {
      await safeFetchJSON(`/api/admin/disputes/${row.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution }),
      });
    } catch {}
    updateRowOverride("Disputes", row.id, { status, resolution }, setRows);
  }

  // Notifications
  async function handleBroadcast() {
    if (!broadcast.title.trim() || !broadcast.message.trim()) return;
    setSending(true);
    try {
      await safeFetchJSON("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broadcast),
      });
    } catch {
    } finally {
      const synthetic = {
        id: `N${Date.now()}`,
        userId: "*",
        type: "broadcast",
        title: broadcast.title.trim(),
        message: broadcast.message.trim(),
        read: false,
        createdAt: new Date().toISOString(),
        audience: broadcast.audience,
      };
      if (tab === "Notifications") setRows((prev) => [synthetic, ...prev]);
      setBroadcast({ title: "", message: "", audience: "all" });
      setSending(false);
    }
  }

  async function handleCustomSend() {
    if (!custom.title.trim() || !custom.message.trim()) return;
    const ids = custom.userIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setSending(true);
    try {
      await safeFetchJSON("/api/notifications/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: custom.title.trim(), message: custom.message.trim(), userIds: ids }),
      });
    } catch {
    } finally {
      setCustom({ title: "", message: "", userIds: "" });
      setSending(false);
    }
  }

  async function handleDeleteNotification(id) {
    confirm({
      title: "Delete notification",
      msg: "Are you sure you want to delete this notification?",
      onConfirm: async () => {
        try {
          await safeFetchJSON(`/api/notifications/${id}`, { method: "DELETE" });
        } catch {}
        setRows((rs) => rs.filter((r) => r.id !== id));
      },
    });
  }

  async function handleResendNotification(id) {
    try {
      await safeFetchJSON(`/api/notifications/${id}/resend`, { method: "POST" });
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, resentAt: new Date().toISOString() } : r)));
    } catch {}
  }

  // Guard
  if (role !== "admin") {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-4 p-4 rounded-xl bg-yellow-100 border border-yellow-300">
          <b>Admin only.</b> In mock mode, set <code>localStorage.user</code> to {"{ role: 'admin' }"} or add{" "}
          <code>?admin=1</code> to the URL.
        </div>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  /* ===================================================================================================================
     UI
     =================================================================================================================== */
  return (
    <div className="p-6 max-w-7xl mx-auto" ref={topRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Dashboard (Mock)</h1>
        <div className="hidden md:flex items-center gap-2">
          <Badge color="slate">Mode: mock-friendly</Badge>
          <Badge color="blue">{tab}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-4" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx("px-3 py-2 rounded-2xl border", tab === t ? "bg-black text-white" : "bg-white")}
            title={`Open ${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Special-case tabs */}
      {tab === "Finance" ? (
        <Finance />
      ) : tab === "Support" ? (
        <Support />
      ) : tab === "Financials" ? (
        <FinancialsDashboard />
      ) : tab === "Risk & Ops" ? (
        <RiskOpsDashboard />
      ) : tab === "Growth" ? (
        <GrowthDashboard />
      ) : (
        <>
          {/* Controls Row (legacy UI) */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur mb-3 border rounded-2xl p-2">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
              <div className="flex items-center gap-2">
                <Input
                  className="w-[22rem]"
                  placeholder={`Search in ${tab}…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={`Search in ${tab}`}
                />
                <Btn
                  onClick={() => {
                    setQuery("");
                    setFilterValue("");
                    setSort({ key: null, dir: "asc" });
                    setSelected([]);
                    setPage(1);
                  }}
                  title="Clear filters"
                >
                  Clear
                </Btn>
                {/* CSV + XLSX buttons */}
                <Btn onClick={() => exportToCSV(filtered, `${tab}.csv`)} title="Export current view to CSV">
                  Export CSV
                </Btn>
                <Btn onClick={() => exportTableToXLSX(filtered, `${tab}.xlsx`, tab)} title="Export current view to Excel">
                  Export XLSX
                </Btn>
              </div>

              {/* Per-tab quick filters */}
              <div className="flex items-center gap-2">
                {tab === "Users" && (
                  <>
                    <Select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} aria-label="Filter users by role">
                      <option value="">All Roles</option>
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                      <option value="admin">Admin</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset filter</Btn>
                  </>
                )}

                {tab === "Payouts" && (
                  <>
                    <Select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} aria-label="Filter payouts by status">
                      <option value="">All Status</option>
                      <option value="queued">Queued</option>
                      <option value="paid">Paid</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset filter</Btn>
                  </>
                )}

                {tab === "Refunds" && (
                  <>
                    <Select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} aria-label="Filter refunds by status">
                      <option value="">All Status</option>
                      <option value="processed">Processed</option>
                      <option value="queued">Queued</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset filter</Btn>
                  </>
                )}

                {tab === "Disputes" && (
                  <>
                    <Select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} aria-label="Filter disputes by status">
                      <option value="">All Status</option>
                      <option value="open">open</option>
                      <option value="resolved">resolved</option>
                      <option value="rejected">rejected</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset filter</Btn>
                  </>
                )}
              </div>

              {/* Column visibility + page size */}
              <div className="flex items-center gap-2 ml-auto">
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "25", 10);
                    setPageSize(v);
                    setTabPrefs(tab, { pageSize: v });
                    setPage(1);
                  }}
                  title="Rows per page"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </Select>

                <Collapsible title="Columns" startOpen={false}>
                  {allCols.length === 0 ? (
                    <div className="text-sm text-gray-600">No columns.</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allCols.map((c) => {
                        const on = visibleCols.length ? visibleCols.includes(c) : activeCols.includes(c);
                        return (
                          <label key={c} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) => {
                                let next = new Set(visibleCols.length ? visibleCols : activeCols);
                                if (e.target.checked) next.add(c);
                                else next.delete(c);
                                const arr = Array.from(next);
                                setVisibleCols(arr);
                                setTabPrefs(tab, { visibleCols: arr });
                              }}
                            />
                            <span>{c}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </Collapsible>
              </div>
            </div>

            {(query || filterValue || sort.key) && (
              <div className="mt-2 text-xs text-gray-600">
                Active:
                {query ? <> {" "}search="<b>{query}</b>"</> : null}
                {filterValue ? <> {" "}filter="<b>{filterValue}</b>"</> : null}
                {sort.key ? <> {" "}sort="<b>{sort.key} {sort.dir}</b>"</> : null}
              </div>
            )}
          </div>

          {/* QUICK STATS */}
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="px-3 py-2 border rounded-2xl bg-white text-sm">
              <span className="font-semibold">{filtered.length}</span> items
            </div>
            {tab === "Lessons" && (
              <>
                <div className="px-3 py-2 border rounded-2xl bg-white text-sm">
                  trials: <span className="font-semibold">{filtered.filter((r) => r.status === "trial").length}</span>
                </div>
                <div className="px-3 py-2 border rounded-2xl bg-white text-sm">
                  reschedule pending:{" "}
                  <span className="font-semibold">{filtered.filter((r) => r.rescheduleRequested && !r.rescheduleStatus).length}</span>
                </div>
              </>
            )}
            {tab === "Disputes" && (
              <div className="px-3 py-2 border rounded-2xl bg-white text-sm">
                open disputes:{" "}
                <span className="font-semibold">{filtered.filter((r) => (r.status || "open") === "open").length}</span>
              </div>
            )}
          </div>

          {/* BULK ACTIONS */}
          {selected.length > 0 && (
            <div className="flex gap-2 items-center mb-3">
              <Badge color="purple">{selected.length} selected</Badge>

              {/* FIXED: functional bulk Mark Paid for Payouts */}
              {tab === "Payouts" && (
                <Btn
                  kind="success"
                  onClick={() => {
                    const now = new Date().toISOString();
                    const ids = selected.map((idx) => pageRows[idx]?.id).filter(Boolean);

                    // persist to overrides
                    const ov = loadOverrides();
                    ids.forEach((id) => {
                      ov.payouts[id] = { ...(ov.payouts[id] || {}), status: "paid", paidAt: now };
                    });
                    saveOverrides(ov);

                    // update in-memory rows
                    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, status: "paid", paidAt: now } : r)));

                    setSelected([]);
                  }}
                >
                  Mark Paid
                </Btn>
              )}

              {tab === "Notifications" && (
                <Btn onClick={() => alert("Mark selected notifications as read (mock)")} kind="info">
                  Mark Read
                </Btn>
              )}
              <Btn onClick={() => alert("Delete selected rows (mock)")} kind="danger">Delete</Btn>
            </div>
          )}

          {/* NOTIFICATIONS ADMIN TOOLS */}
          {tab === "Notifications" && (
            <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="border rounded-2xl bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Broadcast to audience</h2>
                  <Badge color="blue">admin</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Input placeholder="Title" value={broadcast.title} onChange={(e) => setBroadcast((s) => ({ ...s, title: e.target.value }))} />
                  <Textarea rows={3} placeholder="Message…" value={broadcast.message} onChange={(e) => setBroadcast((s) => ({ ...s, message: e.target.value }))} />
                  <div className="flex items-center gap-2">
                    <Select value={broadcast.audience} onChange={(e) => setBroadcast((s) => ({ ...s, audience: e.target.value }))}>
                      <option value="all">All users</option>
                      <option value="tutors">Tutors only</option>
                      <option value="students">Students only</option>
                    </Select>
                    <Btn
                      kind="primary"
                      onClick={handleBroadcast}
                      disabled={sending || !broadcast.title.trim() || !broadcast.message.trim()}
                      title="Send broadcast"
                    >
                      {sending ? "Sending…" : "Send broadcast"}
                    </Btn>
                  </div>
                </div>
              </div>

              <div className="border rounded-2xl bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Custom notification (by user IDs)</h2>
                  <Badge color="blue">admin</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Input placeholder="Title" value={custom.title} onChange={(e) => setCustom((s) => ({ ...s, title: e.target.value }))} />
                  <Textarea rows={3} placeholder="Message…" value={custom.message} onChange={(e) => setCustom((s) => ({ ...s, message: e.target.value }))} />
                  <Input placeholder="User IDs (comma-separated)" value={custom.userIds} onChange={(e) => setCustom((s) => ({ ...s, userIds: e.target.value }))} />
                  <div className="flex items-center gap-2">
                    <Btn
                      kind="primary"
                      onClick={handleCustomSend}
                      disabled={sending || !custom.title.trim() || !custom.message.trim() || !custom.userIds.trim()}
                      title="Send custom notification"
                    >
                      {sending ? "Sending…" : "Send custom"}
                    </Btn>
                    <Btn onClick={() => setCustom({ title: "", message: "", userIds: "" })} title="Clear custom form">
                      Clear
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DATA TABLE (legacy) */}
          <div className="overflow-auto border rounded-2xl">
            {loading ? (
              <div className="p-6">Loading {tab}…</div>
            ) : pageRows.length === 0 ? (
              <div className="p-6 text-gray-600">No {tab.toLowerCase()} found.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border-b">
                      <input
                        type="checkbox"
                        aria-label="Select all rows"
                        checked={pageRows.length > 0 && selected.length === pageRows.length}
                        onChange={(e) => setSelected(e.target.checked ? pageRows.map((_, i) => i) : [])}
                      />
                    </th>
                    {activeCols.map((k) => (
                      <th key={k} className="text-left px-3 py-2 border-b">
                        <button
                          onClick={() =>
                            setSort((s) =>
                              s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }
                            )
                          }
                          style={{ all: "unset", cursor: "pointer" }}
                          title={`Sort by ${k}`}
                          aria-label={`Sort by ${k}`}
                        >
                          {k}
                          {sort.key === k ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                    <th className="text-left px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((row, i) => {
                    const flat = flatten(row);
                    const keys = activeCols;
                    const checked = selected.includes(i);

                    const isLesson = tab === "Lessons";
                    const isDispute = tab === "Disputes";
                    const rowHasReschedule = isLesson && row.rescheduleRequested && !row.rescheduleStatus;
                    const rowIsOpenDispute = isDispute && (!row.status || row.status === "open");

                    return (
                      <tr
                        key={row.id ?? i}
                        className={cx(
                          "odd:bg-white even:bg-gray-50 align-top",
                          rowHasReschedule && "outline outline-1 outline-yellow-300",
                          rowIsOpenDispute && "outline outline-1 outline-red-300"
                        )}
                      >
                        <td className="px-3 py-2 border-b">
                          <input
                            type="checkbox"
                            aria-label={`Select row ${i + 1}`}
                            checked={checked}
                            onChange={(e) =>
                              setSelected((sel) =>
                                e.target.checked ? [...sel, i] : sel.filter((x) => x !== i)
                              )
                            }
                          />
                        </td>

                        {keys.map((k, idx) => {
                          const val = flat[k];

                          if (isLesson && k === "status") {
                            const isTrial = row.status === "trial";
                            const count = Number(row.studentTrialCount ?? 0);
                            const limit = row.studentTrialLimit == null ? null : Number(row.studentTrialLimit);
                            const over = limit != null ? count > limit : false;
                            const atCap = limit != null ? count === limit : false;

                            return (
                              <td key={k} className="px-3 py-2 border-b space-x-1">
                                <Badge color={row.status === "booked" ? "blue" : "purple"}>
                                  {formatCell(val)}
                                </Badge>
                                {isTrial && (
                                  <Badge color={over ? "red" : atCap ? "orange" : "green"} title="Trial usage">
                                    {`trial ${count}/${limit ?? "∞"}`}
                                  </Badge>
                                )}
                              </td>
                            );
                          }

                          if (isLesson && k === "rescheduleStatus") {
                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                <Badge color={row.rescheduleStatus === "approved" ? "green" : "red"}>
                                  {formatCell(val)}
                                </Badge>
                              </td>
                            );
                          }

                          if (isLesson && (row.studentTrialCount != null || row.studentTrialLimit != null) && idx === 0 && k !== "status") {
                            const count = Number(row.studentTrialCount ?? 0);
                            const limit = row.studentTrialLimit == null ? null : Number(row.studentTrialLimit);
                            const over = limit != null ? count > limit : false;
                            const atCap = limit != null ? count === limit : false;

                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                {formatCell(val)}
                                <div className="mt-1">
                                  <Badge color={over ? "red" : atCap ? "orange" : "green"}>
                                    {`trial ${count}/${limit ?? "∞"}`}
                                  </Badge>
                                </div>
                              </td>
                            );
                          }

                          if (isDispute && k === "status") {
                            const color = (val || "open") === "resolved" ? "green" : (val || "open") === "rejected" ? "red" : "yellow";
                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                <Badge color={color}>{formatCell(val || "open")}</Badge>
                              </td>
                            );
                          }

                          return (
                            <td key={k} className="px-3 py-2 border-b">
                              {formatCell(val)}
                            </td>
                          );
                        })}

                        <td className="px-3 py-2 border-b space-x-1">{renderActions(row)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* DETAILS DRAWER */}
          {detailsRow && (
            <div className="mt-3 border rounded-2xl bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Row details</div>
                <Btn onClick={() => setDetailsRow(null)}>Close</Btn>
              </div>
              <pre className="mt-2 text-xs overflow-auto max-h-96">
                {JSON.stringify(detailsRow, null, 2)}
              </pre>
            </div>
          )}

          {/* PAGINATION */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-600">
              Page <b>{page}</b> of <b>{totalPages}</b> • Showing <b>{pageRows.length}</b> of <b>{filtered.length}</b> results
            </div>
            <div className="flex items-center gap-2">
              <Btn onClick={() => setPage(1)} disabled={page === 1}>First</Btn>
              <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Btn>
              <Btn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Btn>
              <Btn onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last</Btn>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-3">
            Endpoints: <code>/api/admin/users</code>, <code>/api/tutors</code>, <code>/api/lessons</code>,{" "}
            <code>/api/payouts</code>, <code>/api/refunds</code>, <code>/api/notifications</code>,{" "}
            <code>/api/admin/disputes</code>. Handlers: <code>[...]</code> or <code>{'{'} items: [...] {'}'}</code>.
          </div>
        </>
      )}

      {/* Confirm dialog portal */}
      {ConfirmUI}
    </div>
  );
}

/* =====================================================================================================================
   6) HELPERS
   ===================================================================================================================== */

function flatten(obj, prefix = "", out = {}) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object") {
    out[prefix || "value"] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out);
    else out[p] = v;
  }
  return out;
}
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function formatDate(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    if (ISO_RE.test(v)) return formatDate(v);
    return v.length > 120 ? v.slice(0, 117) + "…" : v;
  }
  if (Array.isArray(v)) return v.length > 5 ? `Array(${v.length})` : JSON.stringify(v);
  return JSON.stringify(v);
}

// CSV export (legacy helper kept)
function exportToCSV(rows, filename) {
  if (!rows.length) return;
  const flatRows = rows.map((r) => flatten(r));
  const headers = Object.keys(flatten(rows[0]));
  const csv = [
    headers.join(","),
    ...flatRows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* =====================================================================================================================
   7) EXTRA UTILITIES
   ===================================================================================================================== */

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr || []) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

function sumBy(arr, sel = (x) => x) {
  let s = 0;
  for (const x of arr || []) s += Number(sel(x) || 0);
  return s;
}

function currencyFormat(value, currency = "USD", locale = "en-US") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function downloadJSON(obj, filename = "export.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pretty(v) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const flatRows = rows.map((r) => flatten(r));
  const headers = Object.keys(flatRows[0]);
  return [
    headers.join(","),
    ...flatRows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
}

function downloadCSV(rows, filename = "export.csv") {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function debounce(fn, ms = 250) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function pluralize(n, singular, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}
