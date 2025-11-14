// client/src/pages/StudentLessonDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const MOCK = import.meta.env.VITE_MOCK === "1";

/* -------------------- helpers -------------------- */

function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationEnd(iso, minutes) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || !minutes) return null;
  return new Date(d.getTime() + Number(minutes) * 60000);
}

/* STUDENT-FACING STATUS TRANSLATION (A1) */
function translateStatus(raw) {
  switch (raw) {
    case "booked":
      return "pending_payment";
    case "pending":
      return "paid_waiting_tutor";
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "reschedule_pending":
      return "reschedule_requested";
    default:
      return raw || "pending_payment";
  }
}

function deriveStatus(l) {
  const started = new Date(l.start).getTime() <= Date.now();
  const terminal = ["completed", "cancelled", "expired"];
  if (started && !terminal.includes(l.status)) return "expired";
  return translateStatus(l.status);
}

function normalize(raw) {
  return {
    _id: raw._id || raw.id,
    tutorId: String(raw.tutorId || raw.tutor?._id || raw.tutor || ""),
    tutorName: raw.tutorName || raw.tutor?.name || "Tutor",
    start: raw.start || raw.startTime || raw.begin,
    duration:
      Number(
        raw.duration ||
          (raw.endTime
            ? (new Date(raw.endTime) - new Date(raw.startTime || raw.start)) / 60000
            : 0)
      ) || 0,
    status: raw.status,
    isTrial: !!raw.isTrial,
    price: typeof raw.price === "number" ? raw.price : Number(raw.price) || 0,
    subject: raw.subject || "",
    notes: raw.notes || "",
    createdAt: raw.createdAt,
  };
}

/* -------------------- countdown + pills -------------------- */

function TinyCountdown({ to }) {
  const [left, setLeft] = useState(() => new Date(to).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(to).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [to]);

  if (!to || left <= 0)
    return <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.65 }}>• started</span>;

  const s = Math.floor(left / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (
    <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
      • starts in {h}h {m}m {sec}s
    </span>
  );
}

/* STUDENT-FACING PILL COLOURS (A1) */
function StatusPill({ status }) {
  const map = {
    pending_payment: {
      bg: "#fff7e6",
      color: "#ad6800",
      label: "Payment required",
    },
    paid_waiting_tutor: {
      bg: "#e6f7ff",
      color: "#0050b3",
      label: "Paid — awaiting tutor",
    },
    confirmed: {
      bg: "#e6fffb",
      color: "#006d75",
      label: "Confirmed",
    },
    reschedule_requested: {
      bg: "#f0f5ff",
      color: "#1d39c4",
      label: "Reschedule requested",
    },
    completed: {
      bg: "#f6ffed",
      color: "#237804",
      label: "Completed",
    },
    cancelled: {
      bg: "#fff1f0",
      color: "#a8071a",
      label: "Cancelled",
    },
    expired: {
      bg: "#fafafa",
      color: "#595959",
      label: "Expired",
    },
  };

  const s = map[status] || map.pending_payment;

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}

/* -------------------- page -------------------- */

export default function StudentLessonDetail() {
  const { lessonId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const passed = loc.state?.lesson || null;

  const [lesson, setLesson] = useState(passed ? normalize(passed) : null);
  const [loading, setLoading] = useState(!passed);
  const [err, setErr] = useState("");

  /* Load full lesson */
  async function load() {
    if (!token) {
      nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`, {
        replace: true,
      });
      return;
    }
    if (!lessonId) return;

    setLoading(true);
    setErr("");
    try {
      const data = await apiFetch(
        `/api/lessons/${encodeURIComponent(lessonId)}`,
        { auth: true }
      );
      setLesson(normalize(data));
    } catch (e) {
      setErr(e.message || "Could not load lesson.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!passed) load();
  }, [lessonId]);

  const endAt = useMemo(
    () => (lesson ? durationEnd(lesson.start, lesson.duration) : null),
    [lesson]
  );

  const status = useMemo(
    () => (lesson ? deriveStatus(lesson) : "pending_payment"),
    [lesson]
  );

  /* -------------------- actions -------------------- */

  async function onCancel() {
    if (MOCK) {
      alert("Cancel disabled in mock mode.");
      return;
    }
    if (!confirm("Cancel this lesson?")) return;
    try {
      await apiFetch(`/api/lessons/${lesson._id}/cancel`, {
        method: "PATCH",
        auth: true,
        body: { reason: "user-cancel" },
      });
      await load();
    } catch (e) {
      alert(e.message || "Cancel failed");
    }
  }

  function onWriteReview() {
    if (!lesson?.tutorId) return;
    window.location.href = `/tutors/${lesson.tutorId}?review=1`;
  }

  /* -------------------- render -------------------- */

  if (loading)
    return (
      <div style={{ padding: 16 }}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-64 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );

  if (err)
    return <div className="p-4 text-red-600">{err}</div>;

  if (!lesson)
    return <div className="p-4">Not found.</div>;

  const isTrial = !!lesson.isTrial;
  const isTerminal =
    ["completed", "cancelled", "expired"].includes(status);

  const canPay = !MOCK && !isTrial && status === "pending_payment";
  const canCancel =
    !MOCK &&
    ["pending_payment", "paid_waiting_tutor", "confirmed"].includes(status);

  const showCountdown =
    ["pending_payment", "paid_waiting_tutor", "confirmed", "reschedule_requested"].includes(
      status
    );

  const yourTZ =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  /* -------------------- UI -------------------- */

  return (
    <div className="p-4 space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 border-b bg-white/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">
            Lesson with {lesson.tutorName}
          </h1>
          <StatusPill status={status} />

          {showCountdown && (
            <span className="text-xs opacity-80 ml-auto">
              <TinyCountdown to={lesson.start} />
            </span>
          )}
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
        Times are shown in your timezone: {yourTZ}
      </div>

      {/* Back link */}
      <div className="flex items-center justify-between">
        <span />
        <Link to="/my-lessons" className="text-sm underline">
          ← Back to My Lessons
        </Link>
      </div>

      {/* Trial banner */}
      {isTrial && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#d1fae5",
            border: "1px solid #10b981",
            marginTop: 12,
          }}
        >
          🎉 Trial booked! Your free 30-minute lesson is confirmed.
        </div>
      )}

      {/* Payment required banner */}
      {!isTrial && status === "pending_payment" && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fef9c3",
            border: "1px solid #facc15",
            marginTop: 12,
          }}
        >
          ⚠ Please complete payment to confirm this booking.
        </div>
      )}

      {/* Paid waiting tutor */}
      {!isTrial && status === "paid_waiting_tutor" && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#e0f2fe",
            border: "1px solid #38bdf8",
            marginTop: 12,
          }}
        >
          💳 Payment complete! Waiting for the tutor to confirm.
        </div>
      )}

      {/* Lesson details */}
      <div className="border rounded-2xl p-4 shadow-sm bg-white">
        <div className="flex flex-wrap items-baseline gap-2">
          <div className="text-lg font-semibold">{lesson.tutorName}</div>
          <Link
            to={`/tutors/${lesson.tutorId}`}
            className="ml-auto text-sm border px-2 py-1 rounded-2xl"
          >
            View tutor →
          </Link>
        </div>

        <div className="mt-3 text-sm">
          <div>
            <b>Starts:</b> {fmtDateTime(lesson.start)}
            {showCountdown && <TinyCountdown to={lesson.start} />}
          </div>

          <div>
            <b>Ends:</b>{" "}
            {endAt ? fmtDateTime(endAt.toISOString()) : "—"}
          </div>

          <div>
            <b>Duration:</b> {lesson.duration} min
          </div>

          <div>
            <b>Status:</b> {StatusPill({ status })}
          </div>

          {!isTrial && (
            <div>
              <b>Price:</b> € {euros(lesson.price)}
            </div>
          )}

          {lesson.subject && (
            <div>
              <b>Subject:</b> {lesson.subject}
            </div>
          )}

          {lesson.notes && (
            <div className="mt-2">
              <b>Notes:</b>
              <div className="text-sm whitespace-pre-wrap">{lesson.notes}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {canPay && (
            <Link
              to={`/pay/${lesson._id}`}
              className="text-sm border px-3 py-1 rounded-2xl"
            >
              Pay
            </Link>
          )}

          {canCancel && (
            <button
              onClick={onCancel}
              className="text-sm border px-3 py-1 rounded-2xl"
            >
              Cancel
            </button>
          )}

          <Link
            to={`/tutors/${lesson.tutorId}`}
            className="text-sm border px-3 py-1 rounded-2xl"
          >
            Tutor
          </Link>

          {isTerminal && (
            <button
              onClick={onWriteReview}
              className="text-sm border px-3 py-1 rounded-2xl"
            >
              Write review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
