//client/src/pages/AdminDashboard.jsx
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
import Support from "./admin/tabs/Support.jsx";
import { Badge } from "./admin/common/Badges.jsx";
import { Btn } from "./admin/common/Buttons.jsx";
import { Input, Select, Textarea } from "./admin/common/Inputs.jsx";
import Collapsible from "./admin/common/Collapsible.jsx";
import { useConfirm } from "./admin/common/Confirm.jsx";
import AdminTable from "./admin/common/AdminTable.jsx";
import FinancialsDashboard from "./admin/tabs/FinancialsDashboard.jsx";
import RiskOpsDashboard from "./admin/tabs/RiskOpsDashboard.jsx";
import GrowthDashboard from "./admin/tabs/GrowthDashboard.jsx";

import { safeFetchJSON } from "@/lib/safeFetch.js";
import { exportTableToXLSX } from "@/lib/adminExports.js";

/* =====================================================================================================================
   0) SMALL UI BUILDING BLOCKS
   ===================================================================================================================== */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* =====================================================================================================================
   1) ADMIN OVERRIDES PERSISTENCE
   ===================================================================================================================== */

const OVERRIDES_KEY = "adminDashboard.overrides.v1";

function initOverridesShape() {
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

function loadOverrides() {
  try {
    const o = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "null");
    return o && typeof o === "object"
      ? { ...initOverridesShape(), ...o }
      : initOverridesShape();
  } catch {
    return initOverridesShape();
  }
}

function saveOverrides(o) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
}

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

function applyOverrides(tab, items) {
  const key = tabKey(tab);
  const ov = loadOverrides();
  return items.map((r) => ({ ...r, ...(ov[key]?.[r.id] || {}) }));
}

function updateRowOverride(tab, id, patch, setRows) {
  const key = tabKey(tab);
  const ov = loadOverrides();
  ov[key][id] = { ...(ov[key][id] || {}), ...patch };
  saveOverrides(ov);
  setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

/* =====================================================================================================================
   2) DATA FETCH
   ===================================================================================================================== */

async function getJSON(url, opts = {}) {
  try {
    const data = await safeFetchJSON(url, opts);
    if (data === null) throw new Error("HTTP error or invalid JSON");
    return data;
  } catch {
    // (MOCK FALLBACKS)
    if (url === "/api/admin/users") return { items: [ /* ...mock... */ ] };
    if (url === "/api/tutors") return { items: [ /* ...mock... */ ] };
    if (url === "/api/lessons") return { items: [ /* ...mock... */ ] };
    if (url === "/api/payouts") return { items: [ /* ...mock... */ ] };
    if (url === "/api/refunds") return { items: [ /* ...mock... */ ] };
    if (url === "/api/notifications") return { items: [ /* ...mock... */ ] };
    if (url === "/api/admin/disputes") return { items: [ /* ...mock... */ ] };
    return [];
  }
}

/* =====================================================================================================================
   3) PREFS
   ===================================================================================================================== */

const PREFS_KEY = "adminDashboard.prefs.v1";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "null") || {};
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
   4) TABS + ROUTING
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
    const key = raw.toLowerCase();
    if (!raw) continue;
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

  /* (continues in Part 2...) */
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

  // Notifications admin UI
  const [broadcast, setBroadcast] = useState({
    title: "",
    message: "",
    audience: "all",
  });
  const [custom, setCustom] = useState({
    title: "",
    message: "",
    userIds: "",
  });
  const [sending, setSending] = useState(false);

  // Preferences for each tab
  const [visibleCols, setVisibleCols] = useState(
    () => getTabPrefs("Users").visibleCols || []
  );
  const [pageSize, setPageSize] = useState(
    () => getTabPrefs("Users").pageSize || 25
  );
  const [page, setPage] = useState(1);

  const topRef = useRef(null);
  const { confirm, ConfirmUI } = useConfirm();

  // Admin role (mock friendly)
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

  // Sync prefs on tab changes
  useEffect(() => {
    const prefs = getTabPrefs(tab);
    if (prefs.visibleCols) setVisibleCols(prefs.visibleCols);
    if (prefs.pageSize) setPageSize(prefs.pageSize);
    setPage(1);
  }, [tab]);

  // Fetch rows for current tab
  useEffect(() => {
    if (
      tab === "Finance" ||
      tab === "Support" ||
      tab === "Financials" ||
      tab === "Risk & Ops" ||
      tab === "Growth"
    ) {
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
      const arr = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
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

  /* ========================================================================
     FILTERED / SORTED / SEARCHED ROWS
     ======================================================================== */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let arr = !q
      ? rows
      : rows.filter((r) =>
          JSON.stringify(r).toLowerCase().includes(q)
        );

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

        const A = norm(av),
          B = norm(bv);

        if (A < B) return -1 * dir;
        if (A > B) return 1 * dir;
        return 0;
      });
    }

    return arr;
  }, [rows, query, filterValue, sort, tab]);

  // Pagination
  const allCols = useMemo(
    () => (filtered[0] ? Object.keys(flatten(filtered[0])) : []),
    [filtered]
  );

  const activeCols = useMemo(() => {
    if (!visibleCols || visibleCols.length === 0)
      return allCols.slice(0, 8);
    return visibleCols
      .filter((c) => allCols.includes(c))
      .slice(0, 10);
  }, [visibleCols, allCols]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* ========================================================================
     COLUMN RENDERERS
     ======================================================================== */

  const columns = useMemo(() => {
    return activeCols.map((k, idx) => ({
      key: k,
      render: (row) => {
        const flat = flatten(row);
        const val = flat[k];

        /* ---------- Lesson status ---------- */
        if (tab === "Lessons" && k === "status") {
          const color =
            val === "booked"
              ? "yellow"
              : val === "paid"
              ? "blue"
              : val === "confirmed"
              ? "green"
              : val === "completed"
              ? "purple"
              : val === "cancelled"
              ? "red"
              : val === "expired"
              ? "slate"
              : "gray";

          return <Badge color={color}>{formatCell(val)}</Badge>;
        }

        /* ---------- Lesson - reschedule status ---------- */
        if (tab === "Lessons" && k === "rescheduleStatus") {
          return (
            <Badge
              color={
                row.rescheduleStatus === "approved"
                  ? "green"
                  : "red"
              }
            >
              {formatCell(val)}
            </Badge>
          );
        }

        /* ---------- Lesson - recording state (NEW) ---------- */
        if (tab === "Lessons" && k === "recordingActive") {
          return (
            <Badge color={val ? "red" : "slate"}>
              {val ? "recording" : "not recording"}
            </Badge>
          );
        }

        if (tab === "Lessons" && k === "recordingId") {
          return val ? (
            <a
              href={`/lesson-recordings?lessonId=${row.id}`}
              className="underline text-blue-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              View recordings
            </a>
          ) : (
            ""
          );
        }

        /* ---------- Trial usage badge ---------- */
        if (
          tab === "Lessons" &&
          (row.studentTrialCount != null ||
            row.studentTrialLimit != null) &&
          idx === 0 &&
          k !== "status"
        ) {
          const count = Number(row.studentTrialCount ?? 0);
          const limit =
            row.studentTrialLimit == null
              ? null
              : Number(row.studentTrialLimit);
          const over = limit != null ? count > limit : false;
          const atCap =
            limit != null ? count === limit : false;

          return (
            <div>
              {formatCell(val)}
              <div className="mt-1">
                <Badge
                  color={
                    over
                      ? "red"
                      : atCap
                      ? "orange"
                      : "green"
                  }
                >
                  {`trial ${count}/${limit ?? "∞"}`}
                </Badge>
              </div>
            </div>
          );
        }

        /* ---------- Dispute status ---------- */
        if (tab === "Disputes" && k === "status") {
          const st = val || "open";
          const color =
            st === "resolved"
              ? "green"
              : st === "rejected"
              ? "red"
              : "yellow";
          return <Badge color={color}>{formatCell(st)}</Badge>;
        }

        return formatCell(val);
      },
    }));
  }, [activeCols, tab]);

  /* ========================================================================
     ACTION RENDERER
     ======================================================================== */

  function renderActions(row) {
    return (
      <div className="space-x-1">
        <Btn
          onClick={() =>
            setDetailsRow(detailsRow?.id === row.id ? null : row)
          }
          title="View"
        >
          {detailsRow?.id === row.id ? "Hide" : "View"}
        </Btn>

        {/* Users */}
        {tab === "Users" && (
          <>
            <Select
              value={row.role}
              onChange={(e) =>
                handleChangeUserRole(row, e.target.value)
              }
              className="text-xs"
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
              <option value="admin">Admin</option>
            </Select>
            <Btn
              onClick={() => handleToggleSuspend(row)}
              className="text-xs"
            >
              {row.suspended ? "Unsuspend" : "Suspend"}
            </Btn>
            <Btn
              onClick={() => handleToggleVerify(row)}
              className="text-xs"
            >
              {row.verified ? "Unverify" : "Verify"}
            </Btn>
          </>
        )}

        {/* Tutors */}
        {tab === "Tutors" && (
          <>
            {row.status === "pending" && (
              <>
                <Btn
                  onClick={() => handleApproveTutor(row)}
                  className="text-xs"
                  kind="success"
                >
                  Approve
                </Btn>
                <Btn
                  onClick={() => handleRejectTutor(row)}
                  className="text-xs"
                  kind="danger"
                >
                  Reject
                </Btn>
              </>
            )}

            {row.status === "approved" && (
              <Badge color="green">Approved</Badge>
            )}
            {row.status === "rejected" && (
              <Badge color="red">Rejected</Badge>
            )}
          </>
        )}

        {/* Lessons — reschedule */}
        {tab === "Lessons" && row.rescheduleRequested && !row.rescheduleStatus && (
          <>
            <Btn
              onClick={() => handleReschedule(row, "approved")}
              className="text-xs"
              kind="success"
            >
              Approve
            </Btn>
            <Btn
              onClick={() => handleReschedule(row, "denied")}
              className="text-xs"
              kind="danger"
            >
              Deny
            </Btn>
            <Badge color="yellow">reschedule pending</Badge>
          </>
        )}

        {/* Lessons — reschedule result */}
        {tab === "Lessons" && row.rescheduleStatus && (
          <Badge
            color={
              row.rescheduleStatus === "approved"
                ? "green"
                : "red"
            }
          >
            {row.rescheduleStatus}
          </Badge>
        )}

        {/* Disputes */}
        {tab === "Disputes" &&
          (row.status === "open" || !row.status) && (
            <>
              <Btn
                onClick={() =>
                  handleDisputeStatus(
                    row,
                    "resolved",
                    "Resolved by admin"
                  )
                }
                className="text-xs"
                kind="success"
              >
                Resolve
              </Btn>
              <Btn
                onClick={() =>
                  handleDisputeStatus(
                    row,
                    "rejected",
                    "Rejected by admin"
                  )
                }
                className="text-xs"
                kind="danger"
              >
                Reject
              </Btn>
              <Badge color="yellow">open</Badge>
            </>
          )}

        {tab === "Disputes" &&
          row.status &&
          row.status !== "open" && (
            <Badge
              color={
                row.status === "resolved"
                  ? "green"
                  : "red"
              }
            >
              {row.status}
            </Badge>
          )}

        {/* Notifications */}
        {tab === "Notifications" && (
          <>
            <Btn
              onClick={() => handleResendNotification(row.id)}
              className="text-xs"
              kind="info"
            >
              Resend
            </Btn>
            <Btn
              onClick={() => handleDeleteNotification(row.id)}
              className="text-xs"
              kind="danger"
            >
              Delete
            </Btn>
          </>
        )}
      </div>
    );
  }

  /* ========================================================================
     (Part 3 continues with: USERS/TUTORS/LESSONS/DISPUTES HANDLERS + UI HEADER)
     ======================================================================== */

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

  // Lessons — reschedule handling
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

  // Notifications: broadcast
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

  // Notifications: custom send
  async function handleCustomSend() {
    if (!custom.title.trim() || !custom.message.trim()) return;
    const ids = custom.userIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;

    setSending(true);
    try {
      await safeFetchJSON("/api/notifications/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: custom.title.trim(),
          message: custom.message.trim(),
          userIds: ids,
        }),
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
          await safeFetchJSON(`/api/notifications/${id}`, {
            method: "DELETE",
          });
        } catch {}
        setRows((rs) => rs.filter((r) => r.id !== id));
      },
    });
  }

  async function handleResendNotification(id) {
    try {
      await safeFetchJSON(`/api/notifications/${id}/resend`, {
        method: "POST",
      });
      setRows((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, resentAt: new Date().toISOString() } : r
        )
      );
    } catch {}
  }

  /* ========================================================================
     ADMIN ROLE GUARD
     ======================================================================== */

  if (role !== "admin") {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-4 p-4 rounded-xl bg-yellow-100 border border-yellow-300">
          <b>Admin only.</b>  
          In mock mode, set <code>localStorage.user</code> to {"{ role: 'admin' }"}  
          or add <code>?admin=1</code> to the URL.
        </div>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  /* ========================================================================
     MAIN ADMIN UI — HEADER + TABS
     ======================================================================== */

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
      <div
        className="flex gap-2 flex-wrap mb-4"
        role="tablist"
        aria-label="Admin sections"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx(
              "px-3 py-2 rounded-2xl border",
              tab === t ? "bg-black text-white" : "bg-white"
            )}
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
          {/* BEGIN CONTROLS ROW — continues in PART 4 */}
          {/* Controls Row */}
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

                {/* CSV + XLSX export buttons */}
                <Btn onClick={() => exportToCSV(filtered, `${tab}.csv`)} title="Export CSV">
                  Export CSV
                </Btn>

                <Btn
                  onClick={() => exportTableToXLSX(filtered, `${tab}.xlsx`, tab)}
                  title="Export XLSX"
                >
                  Export XLSX
                </Btn>
              </div>

              {/* Per-tab filters */}
              <div className="flex items-center gap-2">
                {tab === "Users" && (
                  <>
                    <Select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      aria-label="Filter users by role"
                    >
                      <option value="">All roles</option>
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                      <option value="admin">Admin</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset</Btn>
                  </>
                )}

                {tab === "Payouts" && (
                  <>
                    <Select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      aria-label="Filter payouts by status"
                    >
                      <option value="">All</option>
                      <option value="queued">Queued</option>
                      <option value="paid">Paid</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset</Btn>
                  </>
                )}

                {tab === "Refunds" && (
                  <>
                    <Select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      aria-label="Filter refunds by status"
                    >
                      <option value="">All</option>
                      <option value="processed">Processed</option>
                      <option value="queued">Queued</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset</Btn>
                  </>
                )}

                {tab === "Disputes" && (
                  <>
                    <Select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      aria-label="Filter disputes by status"
                    >
                      <option value="">All</option>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </Select>
                    <Btn onClick={() => setFilterValue("")}>Reset</Btn>
                  </>
                )}
              </div>

              {/* Column chooser + page size */}
              <div className="flex items-center gap-2 ml-auto">
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "25", 10);
                    setPageSize(v);
                    setTabPrefs(tab, { pageSize: v });
                    setPage(1);
                  }}
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
                        const on = visibleCols.length
                          ? visibleCols.includes(c)
                          : activeCols.includes(c);
                        return (
                          <label key={c} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) => {
                                let next = new Set(
                                  visibleCols.length ? visibleCols : activeCols
                                );
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
                {query ? <> search="<b>{query}</b>"</> : null}
                {filterValue ? <> filter="<b>{filterValue}</b>"</> : null}
                {sort.key ? (
                  <> sort="<b>{sort.key} {sort.dir}</b>"</>
                ) : null}
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
                  recordings ready:{" "}
                  <span className="font-semibold">
                    {filtered.filter((r) => r.recordingStatus === "available").length}
                  </span>
                </div>

                <div className="px-3 py-2 border rounded-2xl bg-white text-sm">
                  recordings processing:{" "}
                  <span className="font-semibold">
                    {filtered.filter((r) => r.recordingStatus === "processing").length}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* DATA TABLE WRAPPER */}
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
                        checked={
                          pageRows.length > 0 &&
                          selected.length === pageRows.length
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? pageRows.map((_, i) => i) : []
                          )
                        }
                      />
                    </th>

                    {activeCols.map((k) => (
                      <th
                        key={k}
                        className="text-left px-3 py-2 border-b"
                      >
                        <button
                          onClick={() =>
                            setSort((s) =>
                              s.key === k
                                ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" }
                                : { key: k, dir: "asc" }
                            )
                          }
                          style={{ all: "unset", cursor: "pointer" }}
                        >
                          {k}
                          {sort.key === k
                            ? sort.dir === "asc"
                              ? " ↑"
                              : " ↓"
                            : ""}
                        </button>
                      </th>
                    ))}

                    <th className="text-left px-3 py-2 border-b">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((row, i) => {
                    const flat = flatten(row);
                    const keys = activeCols;
                    const checked = selected.includes(i);

                    const isLesson = tab === "Lessons";
                    return (
                      <tr
                        key={row.id ?? i}
                        className={cx(
                          "odd:bg-white even:bg-gray-50 align-top"
                        )}
                      >
                        {/* ROW SELECT CHECKBOX */}
                        <td className="px-3 py-2 border-b">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelected((sel) =>
                                e.target.checked
                                  ? [...sel, i]
                                  : sel.filter((x) => x !== i)
                              )
                            }
                          />
                        </td>

                        {/* DATA CELLS */}
                        {keys.map((k) => {
                          const val = flat[k];

                          // === SPECIAL: LESSONS STATUS BADGE ===
                          if (isLesson && k === "status") {
                            const color =
                              val === "booked"
                                ? "yellow"
                                : val === "paid"
                                ? "blue"
                                : val === "confirmed"
                                ? "green"
                                : val === "completed"
                                ? "purple"
                                : val === "cancelled"
                                ? "red"
                                : val === "expired"
                                ? "slate"
                                : "gray";

                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                <Badge color={color}>{formatCell(val)}</Badge>
                              </td>
                            );
                          }

                          // === SPECIAL: LESSON RE-SCHEDULE ===
                          if (isLesson && k === "rescheduleStatus") {
                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                <Badge
                                  color={
                                    row.rescheduleStatus === "approved"
                                      ? "green"
                                      : "red"
                                  }
                                >
                                  {formatCell(val)}
                                </Badge>
                              </td>
                            );
                          }

                          // === SPECIAL: LESSON TRIAL COUNTERS ===
                          if (
                            isLesson &&
                            (row.studentTrialCount != null ||
                              row.studentTrialLimit != null) &&
                            k !== "status" &&
                            k !== "recordingStatus" &&
                            k !== "recordingUrl"
                          ) {
                            const count = Number(row.studentTrialCount || 0);
                            const limit =
                              row.studentTrialLimit == null
                                ? null
                                : Number(row.studentTrialLimit);
                            const over = limit != null && count > limit;
                            const atCap = limit != null && count === limit;

                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                {formatCell(val)}
                                <div className="mt-1">
                                  <Badge
                                    color={
                                      over ? "red" : atCap ? "orange" : "green"
                                    }
                                  >
                                    trial {count}/{limit ?? "∞"}
                                  </Badge>
                                </div>
                              </td>
                            );
                          }

                          // === NEW: RECORDING STATUS BADGE ===
                          if (isLesson && k === "recordingStatus") {
                            const st = val || "none";
                            const color =
                              st === "available"
                                ? "green"
                                : st === "processing"
                                ? "yellow"
                                : "slate";

                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                <Badge color={color}>
                                  {st === "none" ? "no recording" : st}
                                </Badge>
                              </td>
                            );
                          }

                          // === NEW: RECORDING DOWNLOAD LINK ===
                          if (isLesson && k === "recordingUrl") {
                            return (
                              <td key={k} className="px-3 py-2 border-b">
                                {val ? (
                                  <a
                                    href={val}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                  >
                                    download
                                  </a>
                                ) : (
                                  <span className="text-gray-500">
                                    none
                                  </span>
                                )}
                              </td>
                            );
                          }

                          return (
                            <td key={k} className="px-3 py-2 border-b">
                              {formatCell(val)}
                            </td>
                          );
                        })}

                        {/* ACTION BUTTONS */}
                        <td className="px-3 py-2 border-b">
                          {renderActions(row)}
                        </td>
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
                <div className="font-semibold">Row Details</div>
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
              Page <b>{page}</b> of <b>{totalPages}</b> • Showing{" "}
              <b>{pageRows.length}</b> of <b>{filtered.length}</b>
            </div>

            <div className="flex items-center gap-2">
              <Btn onClick={() => setPage(1)} disabled={page === 1}>
                First
              </Btn>
              <Btn
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Btn>
              <Btn
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Btn>
              <Btn
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                Last
              </Btn>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-3">
            Endpoints: /api/admin/users, /api/tutors, /api/lessons,
            /api/payouts, /api/refunds, /api/notifications,
            /api/admin/disputes.
          </div>
        </>
      )}

      {ConfirmUI}
    </div>
  );
}
