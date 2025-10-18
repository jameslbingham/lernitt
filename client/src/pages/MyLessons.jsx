// client/src/pages/MyLessons.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const MOCK = import.meta.env.VITE_MOCK === "1";

/* -------------------- UI helpers -------------------- */

function StatusBadge({ status, isTrial }) {
  if (isTrial) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 999,
          background: "#fff0f6",
          color: "#c41d7f",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Trial
      </span>
    );
  }
  const map = {
    pending: { label: "Pending", bg: "#fff7e6", color: "#ad6800" },
    confirmed: { label: "Confirmed", bg: "#e6fffb", color: "#006d75" },
    reschedule_requested: { label: "Reschedule requested", bg: "#f0f5ff", color: "#1d39c4" },
    completed: { label: "Completed", bg: "#f6ffed", color: "#237804" },
    cancelled: { label: "Cancelled", bg: "#fff1f0", color: "#a8071a" },
    expired: { label: "Expired", bg: "#fafafa", color: "#595959" },
  };
  const s = map[status] || { label: status || "—", bg: "#fafafa", color: "#595959" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}

function TinyCountdown({ to }) {
  const [left, setLeft] = useState(() => new Date(to).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(to).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [to]);

  if (!to || left <= 0) {
    return (
      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>
        • expired
      </span>
    );
  }
  const s = Math.floor(left / 1000);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return (
    <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
      • starts in {hrs}h {mins}m {secs}s
    </span>
  );
}

/* -------------------- Data helpers -------------------- */

// Normalize lesson from either mock or real API
function normalizeLesson(raw) {
  const id = raw._id || raw.id;
  const startISO = raw.start || raw.startTime || raw.begin;
  const duration =
    Number(
      raw.duration ||
        (raw.endTime ? (new Date(raw.endTime) - new Date(startISO)) / 60000 : 0)
    ) || 0;
  const status = raw.status || "pending";
  const isTrial = !!raw.isTrial;
  const price = typeof raw.price === "number" ? raw.price : Number(raw.price) || 0;
  const tutorId = String(raw.tutorId || raw.tutor?._id || raw.tutorIdStr || raw.tutor) || "";
  const tutorName = raw.tutorName || raw.tutor?.name || "Tutor";
  const subject = raw.subject || "";
  return {
    _id: id,
    start: startISO,
    duration,
    status,
    isTrial,
    price,
    tutorId,
    tutorName,
    subject,
  };
}

function deriveStatus(l) {
  const started = new Date(l.start).getTime() <= Date.now();
  if (started && !["completed", "cancelled"].includes(l.status)) return "expired";
  return l.status || "pending";
}

function euros(priceCentsOrEur) {
  const n = Number(priceCentsOrEur);
  if (!Number.isFinite(n)) return "0.00";
  return (n >= 1000 ? n / 100 : n).toFixed(2);
}

/* -------------------- Page -------------------- */

export default function MyLessons() {
  const nav = useNavigate();
  const loc = useLocation();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const loggedIn = !!token;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // UI filters
  const [hidePast, setHidePast] = useState(false);
  const [onlyTrials, setOnlyTrials] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTop, setShowTop] = useState(false);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  async function load() {
    if (!loggedIn) {
      const next = encodeURIComponent(loc.pathname + loc.search);
      nav(`/login?next=${next}`, { replace: true });
      return;
    }
    setLoading(true);
    setErr("");
    try {
      // Use the apiFetch helper. It routes to mocks when VITE_MOCK=1.
      const list = await apiFetch("/api/lessons/mine", { auth: true });
      const normalized = (Array.isArray(list) ? list : []).map(normalizeLesson);
      setRows(normalized);
    } catch (e) {
      setErr(e.message || "Could not load lessons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // Show back-to-top after some scroll
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Derived + filtered list
  const ordered = useMemo(() => {
    let arr = [...rows].sort((a, b) => {
      const rank = (x) => (["expired", "completed"].includes(deriveStatus(x)) ? 1 : 0);
      return rank(a) - rank(b);
    });

    if (statusFilter !== "all") {
      arr = arr.filter((l) => deriveStatus(l) === statusFilter);
    }
    if (hidePast) {
      arr = arr.filter((l) => !["expired", "completed", "cancelled"].includes(deriveStatus(l)));
    }
    if (onlyTrials) {
      arr = arr.filter((l) => l.isTrial);
    }
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      arr = arr.filter(
        (l) =>
          (l.tutorName || "").toLowerCase().includes(term) ||
          (l.subject || "").toLowerCase().includes(term)
      );
    }
    return arr;
  }, [rows, statusFilter, hidePast, onlyTrials, q]);

  /* --------- Actions (disabled in mock) --------- */

  async function cancelLesson(id) {
    if (MOCK) {
      alert("Cancel is disabled in mock mode.");
      return;
    }
    if (!confirm("Cancel this lesson?")) return;
    try {
      await apiFetch(`/api/lessons/${encodeURIComponent(id)}/cancel`, {
        method: "PATCH",
        auth: true,
        body: { reason: "user-cancel" },
      });
      await load();
    } catch (e) {
      alert(e.message || "Cancel failed");
    }
  }

  /* -------------------- Render -------------------- */

  if (!loggedIn) {
    return <div className="p-4">Redirecting to login…</div>;
  }

  // 🔄 Loading skeletons (upgrade)
  if (loading)
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-2xl p-3 space-y-2">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-64 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Lessons</h1>
        <Link to="/tutors" className="text-sm underline">
          ← Find tutors
        </Link>
      </div>

      {/* Timezone info bar (upgrade) */}
      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#eff6ff",
          marginTop: 4,
        }}
      >
        Times are shown in your timezone: {tz}.
      </div>

      {/* Mock banner */}
      {MOCK && (
        <div
          style={{
            background: "#ecfeff",
            color: "#083344",
            border: "1px solid #bae6fd",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          Mock mode: bookings are free trials and confirmed instantly.
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="text-red-600">
          {err}{" "}
          <button
            onClick={load}
            className="ml-2 border px-2 py-1 rounded-2xl text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Sticky search + filters */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by tutor or subject…"
              className="border rounded-2xl px-3 py-2 text-sm w-full pr-8"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black text-sm"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm flex items-center gap-1">
              <input
                type="checkbox"
                checked={hidePast}
                onChange={(e) => setHidePast(e.target.checked)}
              />
              Hide past lessons
            </label>
            <label className="text-sm flex items-center gap-1">
              <input
                type="checkbox"
                checked={onlyTrials}
                onChange={(e) => setOnlyTrials(e.target.checked)}
              />
              Show only trials
            </label>

            <label className="text-sm flex items-center gap-2">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-2xl px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="reschedule_requested">Reschedule requested</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </label>

            <span className="text-xs opacity-70 ml-auto">
              Showing {ordered.length} lesson{ordered.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Badge legend */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs opacity-80">
            <span className="opacity-60">Legend:</span>
            <StatusBadge status="pending" />
            <StatusBadge status="confirmed" />
            <StatusBadge status="reschedule_requested" />
            <StatusBadge status="completed" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="expired" />
            <StatusBadge isTrial />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!err && ordered.length === 0 && (
        <div className="opacity-70">No lessons yet.</div>
      )}

      {/* List */}
      {!err && ordered.length > 0 && (
        <ul className="space-y-2">
          {ordered.map((l) => {
            const start = new Date(l.start);
            const end =
              isFinite(l.duration) && l.duration > 0
                ? new Date(start.getTime() + l.duration * 60000)
                : null;
            const status = deriveStatus(l);
            const canPay = !MOCK && status === "pending" && !l.isTrial;
            const canCancel = !MOCK && (status === "pending" || status === "confirmed");

            return (
              <li key={l._id} className="border rounded-2xl p-3">
                <Link
                  to={`/student-lesson/${encodeURIComponent(l._id)}`}
                  state={{ lesson: l }}
                  className="flex items-baseline gap-2 hover:underline"
                >
                  <div className="font-medium">{l.tutorName || "Tutor"}</div>
                  <div className="text-xs opacity-70">
                    {start.toLocaleString()}
                    {end ? ` → ${end.toLocaleString()}` : ""}
                  </div>
                  <div className="ml-auto text-xs flex gap-2 items-center">
                    <StatusBadge status={status} isTrial={l.isTrial} />
                    {(status === "pending" ||
                      status === "confirmed" ||
                      status === "reschedule_requested") && (
                      <TinyCountdown to={l.start} />
                    )}
                  </div>
                </Link>

                <div className="text-xs opacity-70 mt-1">
                  {l.subject || "—"} · Price: € {euros(l.price)}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  {canPay && (
                    <Link
                      to={`/pay/${encodeURIComponent(l._id)}`}
                      className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
                    >
                      Pay
                    </Link>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => cancelLesson(l._id)}
                      className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
                    >
                      Cancel
                    </button>
                  )}
                  <Link
                    to={`/tutors/${encodeURIComponent(l.tutorId)}`}
                    className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
                  >
                    Tutor
                  </Link>

                  {/* ✨ Copy summary (upgrade) */}
                  <button
                    onClick={async () => {
                      const lines = [
                        `Tutor: ${l.tutorName}`,
                        `When: ${new Date(l.start).toLocaleString()}`,
                        `Duration: ${l.duration} min`,
                        `Type: ${l.isTrial ? "Trial" : "Paid"}`,
                        `Status: ${status}`,
                        `${window.location.origin}/student-lesson/${l._id}`,
                      ].join("\n");
                      try {
                        await navigator.clipboard.writeText(lines);
                        alert("Lesson summary copied!");
                      } catch {
                        alert("Copy failed");
                      }
                    }}
                    className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
                  >
                    Copy summary
                  </button>

                  {/* ✨ Add to calendar (.ics) (upgrade) */}
                  <button
                    onClick={() => {
                      const dtstart = new Date(l.start)
                        .toISOString()
                        .replace(/[-:]/g, "")
                        .split(".")[0] + "Z";
                      const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lernitt//MyLessons//EN
BEGIN:VEVENT
UID:${l._id}@lernitt
SUMMARY:Lesson with ${l.tutorName}
DTSTART:${dtstart}
DURATION:PT${l.duration}M
DESCRIPTION:${l.isTrial ? "Trial lesson" : "Paid lesson"}
LOCATION:Online
END:VEVENT
END:VCALENDAR`;
                      const blob = new Blob([ics], { type: "text/calendar" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `lesson-${l._id}.ics`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
                  >
                    Add to calendar
                  </button>

                  {/* ✨ Write review shortcut (upgrade) */}
                  {status === "completed" && (
                    <Link
                      to={`/tutors/${encodeURIComponent(l.tutorId)}?review=1`}
                      className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
                    >
                      Write review
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Floating Back to Top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 rounded-full shadow-lg border px-4 py-2 text-sm bg-white/90 hover:bg-white transition"
          aria-label="Back to top"
          title="Back to top"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}
