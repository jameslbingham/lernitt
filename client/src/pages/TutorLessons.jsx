// client/src/pages/TutorLessons.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  listTutorLessons,
  tutorConfirmLesson,
  tutorCompleteLesson,
  tutorApproveReschedule,
  tutorRejectReschedule,
  tutorRejectPending,
  tutorExpireOverdue,
} from "../api/tutorLessons.js";

/* -------------------- A1 STATUS MAP -------------------- */
/*
Student side:
  student reserves → status="booked"
  student pays     → status="paid"          (formerly 'pending')
  tutor approves   → status="confirmed"
  tutor completes  → status="completed"

Reschedule:
  student asks → "reschedule_requested"
  tutor approves/rejects → merges into normal cycle

Failure:
  cancelled / expired
*/

const STATUS_LABEL = {
  booked: "Awaiting student payment",
  paid: "Waiting for your approval",
  reschedule_requested: "Reschedule requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

/* ---------------------- UI Badges ----------------------- */

function StatusBadge({ s }) {
  const cls =
    s === "booked"
      ? "bg-yellow-100 text-yellow-800"
      : s === "paid"
      ? "bg-blue-100 text-blue-800"
      : s === "reschedule_requested"
      ? "bg-purple-100 text-purple-800"
      : s === "confirmed"
      ? "bg-green-100 text-green-800"
      : s === "completed"
      ? "bg-green-200 text-green-800"
      : s === "cancelled"
      ? "bg-red-100 text-red-800"
      : s === "expired"
      ? "bg-gray-200 text-gray-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span className={`text-xs px-2 py-1 rounded-2xl ${cls}`}>
      {STATUS_LABEL[s] || s}
    </span>
  );
}

function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

/* --------------------- Start time helper ---------------------- */

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

/* ----------------------- Countdown ---------------------------- */

function TinyCountdown({ to }) {
  const [left, setLeft] = useState(() =>
    to ? new Date(to).getTime() - Date.now() : 0
  );

  useEffect(() => {
    if (!to) return;
    const id = setInterval(
      () => setLeft(new Date(to).getTime() - Date.now()),
      1000
    );
    return () => clearInterval(id);
  }, [to]);

  if (!to || left <= 0)
    return <span className="ml-2 text-xs opacity-60">• starting</span>;

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

/* ================================================================
   TUTOR LESSONS (fully updated with A1 lifecycle)
================================================================ */

export default function TutorLessons() {
  const [lessons, setLessons] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  /* -------------------- LOAD LESSONS -------------------- */
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

    // auto refresh every 30 seconds
    const id = setInterval(() => setLessons((p) => [...p]), 30000);
    return () => clearInterval(id);
  }, []);

  /* ---------------------- FILTERING ---------------------- */

  const FILTER_OPTIONS = {
    all: "All",
    booked: "Awaiting payment",
    paid: "Awaiting your approval",
    reschedule_requested: "Reschedule requests",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  const filtered = useMemo(() => {
    let arr =
      filter === "all"
        ? lessons
        : lessons.filter((l) => (l.status || "").toLowerCase() === filter);

    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter((l) => {
        const hay = `${l.student || ""} ${l.subject || ""} ${l.date || ""} ${
          l.time || ""
        }`.toLowerCase();
        return hay.includes(t);
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

  /* ------------------------ ACTIONS ------------------------ */

  async function onTutorConfirm(id) {
    try {
      setLessons(await tutorConfirmLesson(id));
    } catch (e) {
      setError(e.message || "Confirm failed");
    }
  }

  async function onTutorComplete(id) {
    try {
      setLessons(await tutorCompleteLesson(id));
    } catch (e) {
      setError(e.message || "Complete failed");
    }
  }

  async function onApproveReschedule(id) {
    try {
      setLessons(await tutorApproveReschedule(id));
    } catch (e) {
      setError(e.message || "Approve failed");
    }
  }

  async function onRejectReschedule(id) {
    try {
      setLessons(await tutorRejectReschedule(id));
    } catch (e) {
      setError(e.message || "Reject failed");
    }
  }

  async function onRejectPending(id) {
    try {
      setLessons(await tutorRejectPending(id));
    } catch (e) {
      setError(e.message || "Reject failed");
    }
  }

  async function onExpireOverdue() {
    try {
      setLessons(await tutorExpireOverdue());
    } catch (e) {
      setError(e.message || "Expire failed");
    }
  }

  /* ------------------------ LOADING ------------------------ */

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">My Lessons</h1>
        <div className="animate-pulse space-y-4 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-2xl p-3">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-64 bg-gray-200 rounded mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------ RENDER ------------------------ */

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Lessons</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-2xl border" onClick={onExpireOverdue}>
            Expire overdue
          </button>
          <Link to="/availability" className="text-sm underline">
            ← Back
          </Link>
        </div>
      </div>

      {/* Timezone */}
      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#eff6ff",
        }}
      >
        Times shown in your timezone: {tz}.
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Search + filters */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student, subject, date…"
              className="w-full border p-2 rounded-2xl text-sm"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(FILTER_OPTIONS).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1 rounded-2xl border text-sm ${
                  filter === k ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}

            <span className="ml-auto text-xs opacity-70 self-center">
              Showing {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {/* Lesson list */}
      <div className="grid gap-2">
        {filtered.map((l) => {
          const start = getStart(l);
          const s = (l.status || "").toLowerCase();

          const showCountdown =
            ["paid", "confirmed", "reschedule_requested"].includes(s);

          return (
            <div
              key={l.id || l._id}
              className="border rounded-2xl p-3 flex flex-col sm:flex-row justify-between gap-3"
            >
              <div className="flex-1">
                <div className="font-semibold">
                  {l.date} {l.time} <span className="opacity-70">with</span> {l.student}
                  {showCountdown && start && (
                    <TinyCountdown to={start.toISOString()} />
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge s={s} />
                  {l.subject && (
                    <span className="text-xs opacity-70">{l.subject}</span>
                  )}
                  {l.price != null && (
                    <span className="text-xs opacity-70">
                      € {euros(l.price)}
                    </span>
                  )}
                </div>

                {s === "reschedule_requested" && (
                  <div className="text-xs mt-1">
                    Request: <b>{l.requestedNewDate} {l.requestedNewTime}</b>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {/* Student paid → Tutor must approve */}
                {s === "paid" && (
                  <>
                    <button
                      className="px-3 py-1 rounded-2xl border"
                      onClick={() => onTutorConfirm(l.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="px-3 py-1 rounded-2xl border"
                      onClick={() => onRejectPending(l.id)}
                    >
                      Reject
                    </button>
                  </>
                )}

                {/* Reschedule request */}
                {s === "reschedule_requested" && (
                  <>
                    <button
                      className="px-3 py-1 rounded-2xl border"
                      onClick={() => onApproveReschedule(l.id)}
                    >
                      Approve change
                    </button>
                    <button
                      className="px-3 py-1 rounded-2xl border"
                      onClick={() => onRejectReschedule(l.id)}
                    >
                      Keep original
                    </button>
                  </>
                )}

                {/* Confirmed → can mark complete */}
                {s === "confirmed" && (
                  <button
                    className="px-3 py-1 rounded-2xl border"
                    onClick={() => onTutorComplete(l.id)}
                  >
                    Mark complete
                  </button>
                )}
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
    </div>
  );
}
