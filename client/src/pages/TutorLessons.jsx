// client/src/pages/TutorLessons.jsx
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listTutorLessons,
  tutorApproveBooking,
  tutorRejectBooking,
  tutorApproveReschedule,
  tutorRejectReschedule,
  tutorMarkCompleted,
  tutorExpireOverdue,
} from "../api/tutorLessons.js";

/* -------------------------------------------------------
   STATUS → FRIENDLY LABELS (Tutor view, new lifecycle)
------------------------------------------------------- */
const STATUS_LABEL = {
  pending_payment: "Payment required",
  paid_waiting_tutor: "Paid — awaiting tutor",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  reschedule_requested: "Reschedule requested",
};

/* -------------------------------------------------------
   BADGE COLORS
------------------------------------------------------- */
function StatusBadge({ s }) {
  const map = {
    pending_payment: "bg-yellow-100 text-yellow-800",
    paid_waiting_tutor: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-green-200 text-green-900",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-gray-200 text-gray-700",
    reschedule_requested: "bg-purple-100 text-purple-800",
  };
  const cls = map[s] || "bg-gray-100 text-gray-800";

  return (
    <span className={`text-xs px-2 py-1 rounded-2xl ${cls}`}>
      {STATUS_LABEL[s] || STATUS_LABEL.pending_payment}
    </span>
  );
}

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */
function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

function getStart(lesson) {
  const iso = lesson.start || lesson.startTime || lesson.startISO;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* Map raw backend status → lifecycle status */
function translateStatus(raw) {
  const s = (raw || "booked").toLowerCase();
  switch (s) {
    case "booked":
      return "pending_payment";
    case "paid":
      return "paid_waiting_tutor";
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "reschedule_requested":
      return "reschedule_requested";
    default:
      return "pending_payment";
  }
}

/* Apply expiry rule on top of translation */
function deriveStatus(lesson) {
  const start = getStart(lesson);
  const translated = translateStatus(lesson.status);
  const started = start ? start.getTime() <= Date.now() : false;

  if (
    started &&
    !["completed", "cancelled", "expired"].includes(translated)
  ) {
    return "expired";
  }
  return translated;
}

/* Tiny countdown (per row) */
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
    return <span className="ml-2 text-xs opacity-60">• starting/started</span>;

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

/* -------------------------------------------------------
   PAGE
------------------------------------------------------- */
export default function TutorLessons() {
  const [lessons, setLessons] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ ADDED: Live time state to refresh Join button visibility
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const navigate = useNavigate();

  /* ---------- Proper fetchLessons function ---------- */
  async function fetchLessons() {
    try {
      const data = await listTutorLessons();
      setLessons(data || []);
    } catch (e) {
      setError(e.message || "Load failed");
    }
  }

  /* ---------- Initial load ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLessons();
      setLoading(false);
    })();
  }, []);

  /* ---------- Auto-refresh every 5 seconds ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      fetchLessons();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  /* ---------- Filtering + Search ---------- */
  const filtered = useMemo(() => {
    let arr =
      filter === "all"
        ? lessons
        : lessons.filter((l) => l.status === filter);

    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter((l) => {
        const hay = `${l.studentName || ""} ${l.subject || ""}`.toLowerCase();
        return hay.includes(t);
      });
    }

    return [...arr].sort((a, b) => {
      const ad = getStart(a);
      const bd = getStart(b);
      if (ad && bd) return ad - bd;
      return 0;
    });
  }, [lessons, filter, q]);

  /* ---------- Tutor actions (unchanged) ---------- */
  async function onApprove(id) {
    try {
      setLessons(await tutorApproveBooking(id));
    } catch (e) {
      setError(e.message || "Approval failed");
    }
  }

  async function onReject(id) {
    try {
      setLessons(await tutorRejectBooking(id));
    } catch (e) {
      setError(e.message || "Rejection failed");
    }
  }

  async function onApproveReschedule(id) {
    try {
      setLessons(await tutorApproveReschedule(id));
    } catch (e) {
      setError(e.message || "Failed to approve reschedule");
    }
  }

  async function onRejectReschedule(id) {
    try {
      setLessons(await tutorRejectReschedule(id));
    } catch (e) {
      setError(e.message || "Failed to reject reschedule");
    }
  }

  async function onComplete(id) {
    try {
      setLessons(await tutorMarkCompleted(id));
    } catch (e) {
      setError(e.message || "Complete failed");
    }
  }

  async function onExpire() {
    try {
      setLessons(await tutorExpireOverdue());
    } catch (e) {
      setError(e.message || "Expire failed");
    }
  }

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">My Lessons</h1>
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
        <h1 className="text-2xl font-bold">My Lessons</h1>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-2xl border" onClick={onExpire}>
            Expire overdue
          </button>
          <Link to="/tutor-dashboard" className="text-sm underline">
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
        Times are shown in your timezone: {tz}.
      </div>

      {/* Search bar */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search student or subject…"
          className="w-full border p-2 rounded-2xl text-sm"
        />
      </div>

      {/* LIST */}
      <div className="grid gap-2">
        {filtered.map((l) => {
          const start = getStart(l);
          const displayStatus = deriveStatus(l);
          const showCountdown =
            ["booked", "paid", "confirmed", "reschedule_requested"].includes(
              l.status
            );

          // ✅ NEW: 10-minute early join buffer for Tutors
          const startMs = start?.getTime() || 0;
          const durationMs = (l.duration || 60) * 60 * 1000;
          const endMs = startMs + durationMs;
          const joinBufferMs = 10 * 60 * 1000; // 10 minutes
          const canJoin = (now >= startMs - joinBufferMs) && (now <= endMs) && 
                          (l.status === "confirmed" || l.status === "paid");

          return (
            <div
              key={l._id}
              className="border rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1">
                <div className="font-semibold">
                  {start
                    ? start.toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: tz,
                      })
                    : "—"}{" "}
                  <span className="opacity-70">with</span> {l.studentName}
                  {showCountdown && start && (
                    <TinyCountdown to={start.toISOString()} />
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge s={displayStatus} />
                  {l.subject && (
                    <span className="text-xs opacity-70">{l.subject}</span>
                  )}
                  {l.price != null && (
                    <span className="text-xs opacity-70">
                      € {euros(l.price)}
                    </span>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-2">
                {/* ✅ NEW: Join/Enter Lesson Button with Buffer */}
                {canJoin && (
                  <button
                    className="px-3 py-1 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    onClick={() =>
                      navigate(
                        `/video-lesson?lessonId=${encodeURIComponent(
                          l._id
                        )}`
                      )
                    }
                  >
                    Enter lesson
                  </button>
                )}

                {/* Student still needs to pay */}
                {l.status === "booked" && (
                  <span className="px-3 py-1 text-xs opacity-70">
                    Waiting for student to pay
                  </span>
                )}

                {/* Student paid → tutor must approve */}
                {l.status === "paid" && (
                  <>
                    <button
                      className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                      onClick={() => onApprove(l._id)}
                    >
                      Approve
                    </button>
                    <button
                      className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                      onClick={() => onReject(l._id)}
                    >
                      Reject
                    </button>
                  </>
                )}

                {/* Reschedule request */}
                {l.status === "reschedule_requested" && (
                  <>
                    <button
                      className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                      onClick={() => onApproveReschedule(l._id)}
                    >
                      Approve change
                    </button>

                    <button
                      className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                      onClick={() => onRejectReschedule(l._id)}
                    >
                      Keep original
                    </button>
                  </>
                )}

                {/* Confirmed */}
                {l.status === "confirmed" && (
                  <>
                    {/* Only show duplicate "Enter" if buffer logic above is not active yet */}
                    {!canJoin && (
                      <button
                        className="px-3 py-1 rounded-2xl border opacity-50 cursor-not-allowed"
                        disabled
                      >
                        Enter lesson (Locked)
                      </button>
                    )}
                    <button
                      className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                      onClick={() => onComplete(l._id)}
                    >
                      Mark complete
                    </button>
                  </>
                )}

                {/* Completed → "View recordings" button */}
                {l.status === "completed" && (
                  <Link
                    to={`/lesson-recordings?lessonId=${encodeURIComponent(
                      l._id
                    )}`}
                    className="px-3 py-1 rounded-2xl border hover:shadow-sm text-sm bg-blue-50 text-blue-700"
                  >
                    View recordings
                  </Link>
                )}

                {/* Copy summary */}
                <button
                  className="px-3 py-1 rounded-2xl border hover:shadow-sm"
                  onClick={async () => {
                    const when = start
                      ? start.toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: tz,
                        })
                      : "—";
                    const lines = [
                      `Student: ${l.studentName}`,
                      `When (${tz}): ${when}`,
                      l.subject ? `Subject: ${l.subject}` : null,
                      l.price != null ? `Price: € ${euros(l.price)}` : null,
                      `Status: ${
                        STATUS_LABEL[displayStatus] || displayStatus
                      }`,
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
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-sm opacity-70 p-3 border rounded-2xl">
            No lessons match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
