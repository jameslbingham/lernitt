// client/src/pages/TutorLessons.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  listTutorLessons,
  confirmLesson,
  completeLesson,
  approveReschedule,
  rejectReschedule,
  rejectPending,
  expireOverdue,
} from "../api/tutorLessons.js";

/* -------------------- constants & helpers -------------------- */

const STATUS_LABEL = {
  pending: "Pending approval",
  reschedule_pending: "Reschedule requested",
  confirmed: "Confirmed",
  completed: "Completed",
  not_approved: "Not approved",
};

function StatusBadge({ s }) {
  const cls =
    s === "pending"
      ? "bg-yellow-100 text-yellow-800"
      : s === "reschedule_pending"
      ? "bg-purple-100 text-purple-800"
      : s === "confirmed"
      ? "bg-blue-100 text-blue-800"
      : s === "completed"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  return (
    <span className={`text-xs px-2 py-1 rounded-2xl ${cls}`}>
      {STATUS_LABEL[s] || s}
    </span>
  );
}

function DeadlineChip({ until }) {
  if (!until) return null;
  const ms = new Date(until) - new Date();
  const overdue = ms <= 0;
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (
    <span
      className="text-xs px-2 py-1 rounded-2xl"
      style={{
        background: overdue ? "#fee2e2" : "#fef3c7",
        color: overdue ? "#991b1b" : "#92400e",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
      title={new Date(until).toLocaleString()}
    >
      {overdue ? "Overdue" : `Expires in ${h}h ${m}m`}
    </span>
  );
}

function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

// Best-effort start Date from various shapes your API/mocks may send
function getStart(lesson) {
  const iso = lesson.start || lesson.startISO || lesson.begin || null;
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (lesson.date && lesson.time) {
    const d = new Date(`${lesson.date} ${lesson.time}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

// Tiny per-row countdown
function TinyCountdown({ to }) {
  const [left, setLeft] = useState(() => (to ? new Date(to).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!to) return;
    const id = setInterval(() => setLeft(new Date(to).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [to]);

  if (!to || left <= 0) {
    return <span className="ml-2 text-xs opacity-60">• starting/started</span>;
  }
  const s = Math.floor(left / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (
    <span className="ml-2 text-xs opacity-80">
      • starts in {h}h {m}m {sec}s
    </span>
  );
}

/* -------------------- page -------------------- */

export default function TutorLessons() {
  const [lessons, setLessons] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // load lessons
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listTutorLessons();
        setLessons(data || []);
      } catch (e) {
        setError(e.message || "Load failed");
      } finally {
        setLoading(false);
      }
    })();
    const id = setInterval(() => setLessons((prev) => [...prev]), 30_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let arr = filter === "all" ? lessons : lessons.filter((l) => l.status === filter);

    if (q.trim()) {
      const term = q.trim().toLowerCase();
      arr = arr.filter((l) => {
        const hay = `${l.student || ""} ${l.subject || ""} ${l.date || ""} ${l.time || ""}`.toLowerCase();
        return hay.includes(term);
      });
    }

    return [...arr].sort((a, b) => {
      const as = (a.date || "") + " " + (a.time || "");
      const bs = (b.date || "") + " " + (b.time || "");
      if (as && bs) return as.localeCompare(bs);
      const ad = getStart(a);
      const bd = getStart(b);
      if (ad && bd) return ad - bd;
      return 0;
    });
  }, [lessons, filter, q]);

  async function onConfirm(id) {
    try { setLessons(await confirmLesson(id)); } catch (e) { setError(e.message || "Confirm failed"); }
  }
  async function onComplete(id) {
    try { setLessons(await completeLesson(id)); } catch (e) { setError(e.message || "Complete failed"); }
  }
  async function onApproveReschedule(id) {
    try { setLessons(await approveReschedule(id)); } catch (e) { setError(e.message || "Approve failed"); }
  }
  async function onRejectReschedule(id) {
    try { setLessons(await rejectReschedule(id)); } catch (e) { setError(e.message || "Reject failed"); }
  }
  async function onRejectPending(id) {
    try { setLessons(await rejectPending(id)); } catch (e) { setError(e.message || "Reject failed"); }
  }
  async function onExpireOverdue() {
    try { setLessons(await expireOverdue()); } catch (e) { setError(e.message || "Expire failed"); }
  }

  const FilterButton = ({ k, label }) => (
    <button
      onClick={() => setFilter(k)}
      className={`px-3 py-1 rounded-2xl border text-sm ${
        filter === k ? "bg-black text-white" : "bg-white hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  /* --------- Loading skeleton --------- */
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">My Upcoming Lessons</h1>
        <div className="animate-pulse grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-2xl p-3 space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-64 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Upcoming Lessons</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-2xl border" onClick={onExpireOverdue}>
            Expire overdue
          </button>
          <Link to="/availability" className="text-sm underline">← Back</Link>
        </div>
      </div>

      {/* Timezone info bar */}
      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#eff6ff",
        }}
      >
        Times are shown in your timezone: {tz}.
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Sticky search + filters */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student, subject, date, or time…"
              className="w-full border p-2 pr-8 rounded-2xl text-sm"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton k="all" label="All" />
            <FilterButton k="pending" label="Pending" />
            <FilterButton k="reschedule_pending" label="Reschedule pending" />
            <FilterButton k="confirmed" label="Confirmed" />
            <FilterButton k="completed" label="Completed" />
            <FilterButton k="not_approved" label="Not approved" />
            <span className="ml-auto text-xs opacity-70 self-center">
              Showing {filtered.length} lesson{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="grid gap-2">
        {filtered.map((l) => {
          const start = getStart(l);
          const showCountdown =
            l.status === "pending" || l.status === "confirmed" || l.status === "reschedule_pending";

          return (
            <div
              key={l.id || l._id}
              className="border rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1">
                <div className="font-semibold">
                  {l.date} {l.time} <span className="opacity-70">with</span> {l.student}
                  {showCountdown && start && <TinyCountdown to={start.toISOString()} />}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge s={l.status} />
                  {(l.status === "pending" || l.status === "reschedule_pending") && l.pendingUntil && (
                    <DeadlineChip until={l.pendingUntil} />
                  )}
                  {l.status === "reschedule_pending" && (
                    <span className="text-xs">
                      Requested: <b>{l.requestedNewDate} {l.requestedNewTime}</b>
                    </span>
                  )}
                  {(l.subject || l.price != null) && (
                    <span className="text-xs opacity-70">
                      {l.subject ? `${l.subject}` : ""}{l.subject && l.price != null ? " · " : ""}
                      {l.price != null ? `€ ${euros(l.price)}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {l.status === "pending" && (
                  <>
                    <button className="px-3 py-1 rounded-2xl border hover:shadow-sm" onClick={() => onConfirm(l.id)}>
                      Approve
                    </button>
                    <button className="px-3 py-1 rounded-2xl border hover:shadow-sm" onClick={() => onRejectPending(l.id)}>
                      Reject
                    </button>
                  </>
                )}
                {l.status === "reschedule_pending" && (
                  <>
                    <button className="px-3 py-1 rounded-2xl border hover:shadow-sm" onClick={() => onApproveReschedule(l.id)}>
                      Approve change
                    </button>
                    <button className="px-3 py-1 rounded-2xl border hover:shadow-sm" onClick={() => onRejectReschedule(l.id)}>
                      Keep original
                    </button>
                  </>
                )}
                {l.status === "confirmed" && (
                  <button className="px-3 py-1 rounded-2xl border hover:shadow-sm" onClick={() => onComplete(l.id)}>
                    Mark complete
                  </button>
                )}

                {/* Utilities */}
                <button
                  className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                  onClick={async () => {
                    const when = start
                      ? start.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: tz })
                      : `${l.date} ${l.time}`;
                    const lines = [
                      `Student: ${l.student}`,
                      `When (${tz}): ${when}`,
                      l.subject ? `Subject: ${l.subject}` : null,
                      l.price != null ? `Price: € ${euros(l.price)}` : null,
                      `Status: ${STATUS_LABEL[l.status] || l.status}`,
                    ].filter(Boolean);
                    try {
                      await navigator.clipboard.writeText(lines.join("\n"));
                      alert("Summary copied!");
                    } catch {
                      alert("Copy failed");
                    }
                  }}
                >
                  Copy summary
                </button>

                <button
                  className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                  onClick={() => {
                    if (!start) return alert("Calendar export unavailable.");
                    const dtstart = start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                    const uid = (l.id || l._id) + "@lernitt";
                    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lernitt//TutorLessons//EN
BEGIN:VEVENT
UID:${uid}
SUMMARY:Lesson with ${l.student}
DTSTART:${dtstart}
DURATION:PT${Number(l.duration || 60)}M
DESCRIPTION:${STATUS_LABEL[l.status] || l.status}
DTSTAMP:${dtstamp}
LOCATION:Online
END:VEVENT
END:VCALENDAR`;
                    const blob = new Blob([ics], { type: "text/calendar" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `lesson-${l.id || "event"}.ics`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Add to calendar
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-sm opacity-70 p-3 border rounded-2xl">
            No lessons for this filter.
          </div>
        )}
      </div>

      <div className="text-xs opacity-60">
        Mock mode: approvals, rejections, and expiry update only your browser storage.
      </div>
    </div>
  );
}
