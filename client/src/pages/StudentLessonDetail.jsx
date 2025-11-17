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

/* -------------------- lifecycle rules -------------------- */

function deriveStatus(l) {
  const raw = (l.status || "booked").toLowerCase();
  const started = new Date(l.start).getTime() <= Date.now();
  const terminal = ["completed", "cancelled", "expired"];

  if (started && !terminal.includes(raw)) return "expired";
  return raw;
}

const STATUS_LABELS = {
  booked: "Pending — payment needed",
  paid: "Paid — awaiting tutor confirmation",
  confirmed: "Tutor confirmed — lesson is booked",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

/* -------------------- normalize incoming data -------------------- */
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
            ? (new Date(raw.endTime) -
                new Date(raw.startTime || raw.start)) /
              60000
            : 0)
      ) || 0,
    status: raw.status ? raw.status.toLowerCase() : "booked",
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
    const id = setInterval(
      () => setLeft(new Date(to).getTime() - Date.now()),
      1000
    );
    return () => clearInterval(id);
  }, [to]);

  if (!to || left <= 0)
    return (
      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.65 }}>
        • started
      </span>
    );

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

function StatusPill({ status }) {
  const friendly = STATUS_LABELS[status] || STATUS_LABELS.booked;
  const map = {
    booked: { bg: "#fff7e6", color: "#ad6800" },
    paid: { bg: "#e6f7ff", color: "#0050b3" },
    confirmed: { bg: "#e6fffb", color: "#006d75" },
    completed: { bg: "#f6ffed", color: "#237804" },
    cancelled: { bg: "#fff1f0", color: "#a8071a" },
    expired: { bg: "#fafafa", color: "#595959" },
  };
  const style = map[status] || map.booked;

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {friendly}
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

  const [lesson, setLesson] = useState(
    passed ? normalize(passed) : null
  );
  const [loading, setLoading] = useState(!passed);
  const [err, setErr] = useState("");

  /* -------------------- LOAD LESSON -------------------- */
  async function load() {
    if (!token) {
      nav(
        `/login?next=${encodeURIComponent(
          loc.pathname + loc.search
        )}`,
        { replace: true }
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  /* -------------------- AUTO-REFRESH (NEW) -------------------- */
  useEffect(() => {
    if (!lessonId) return;

    const id = setInterval(() => {
      load(); // refresh from DB
    }, 5000);

    return () => clearInterval(id);
  }, [lessonId]);

  /* -------------------- MEMOS -------------------- */

  const endAt = useMemo(
    () => (lesson ? durationEnd(lesson.start, lesson.duration) : null),
    [lesson]
  );

  const status = useMemo(
    () => (lesson ? deriveStatus(lesson) : "booked"),
    [lesson]
  );

  /* -------------------- permissions -------------------- */

  const isTrial = !!lesson?.isTrial;
  const isTerminal = ["completed", "cancelled", "expired"].includes(status);

  const canPay = !MOCK && !isTrial && status === "booked";
  const canCancel = !MOCK && ["booked", "paid", "confirmed"].includes(status);

  const showCountdown = ["booked", "paid", "confirmed"].includes(status);

  const yourTZ =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const friendlyStatus = STATUS_LABELS[status] || STATUS_LABELS.booked;

  /* -------------------- actions -------------------- */

  async function onCancel() {
    if (MOCK) {
      alert("Cancel disabled in mock mode.");
      return;
    }
    if (!confirm("Cancel this lesson?")) return;

    try {
      await apiFetch(
        `/api/lessons/${encodeURIComponent(lesson._id)}/cancel`,
        {
          method: "PATCH",
          auth: true,
          body: { reason: "user-cancel" },
        }
      );
      await load();
    } catch (e) {
      alert(e.message || "Cancel failed");
    }
  }

  function onWriteReview() {
    if (!lesson?.tutorId) return;
    window.location.href = `/tutors/${encodeURIComponent(
      lesson.tutorId
    )}?review=1`;
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

  if (err) return <div className="p-4 text-red-600">{err}</div>;
  if (!lesson) return <div className="p-4">Not found.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 border-b bg-white/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">
            Lesson with {lesson.tutorName || "Tutor"}
          </h1>
          <StatusPill status={status} />
          {showCountdown && (
            <span className="text-xs opacity-80 ml-auto">
              <TinyCountdown to={lesson.start} />
            </span>
          )}
        </div>
      </div>

      {/* Timezone bar */}
      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#eff6ff",
        }}
      >
        Times are shown in your timezone: {yourTZ}.
      </div>

      {/* Back link */}
      <div className="flex items-center justify-between">
        <span />
        <Link to="/my-lessons" className="text-sm underline">
          ← Back to My Lessons
        </Link>
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
          Mock mode: trial bookings are confirmed instantly.
        </div>
      )}

      <div className="border rounded-2xl p-4 shadow-sm bg-white">
        {/* Tutor row */}
        <div className="flex flex-wrap items-baseline gap-2">
          <div className="text-lg font-semibold">
            {lesson.tutorName}
          </div>
          <span className="text-xs opacity-70">
            ({lesson.tutorId})
          </span>
          <Link
            to={`/tutors/${encodeURIComponent(lesson.tutorId)}`}
            className="ml-auto text-sm border px-2 py-1 rounded-2xl shadow-sm"
          >
            View tutor →
          </Link>
        </div>

        {/* Banners */}
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

        {!isTrial && status === "booked" && (
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

        {!isTrial && status === "paid" && (
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

        {/* Details */}
        <div className="mt-3 text-sm">
          <div>
            <b>Starts:</b> {fmtDateTime(lesson.start)}
            {showCountdown && (
              <TinyCountdown to={lesson.start} />
            )}
          </div>
          <div>
            <b>Ends:</b>{" "}
            {endAt ? fmtDateTime(endAt.toISOString()) : "—"}
          </div>
          <div>
            <b>Duration:</b> {lesson.duration} min
          </div>
          <div>
            <b>Status:</b> {friendlyStatus}{" "}
            {isTrial ? "· Trial" : ""}
          </div>
          <div>
            <b>Price:</b> € {euros(lesson.price)}
          </div>
          {lesson.subject && (
            <div>
              <b>Subject:</b> {lesson.subject}
            </div>
          )}
          {lesson.notes && (
            <div className="mt-2">
              <b>Notes:</b>
              <div className="text-sm whitespace-pre-wrap">
                {lesson.notes}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {canPay && (
            <Link
              to={`/pay/${encodeURIComponent(lesson._id)}`}
              className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
            >
              Pay
            </Link>
          )}

          {canCancel && (
            <button
              onClick={onCancel}
              className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
            >
              Cancel
            </button>
          )}

          <Link
            to={`/tutors/${encodeURIComponent(lesson.tutorId)}`}
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
          >
            Tutor
          </Link>

          {isTerminal && (
            <button
              onClick={onWriteReview}
              className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
            >
              Write review
            </button>
          )}
        </div>

        {/* Copy utilities */}
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  window.location.href
                );
                alert("Link copied!");
              } catch {
                alert("Copy failed");
              }
            }}
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
          >
            Copy link
          </button>

          <button
            onClick={async () => {
              const tz =
                Intl.DateTimeFormat().resolvedOptions().timeZone ||
                "UTC";
              const start = new Date(lesson.start);
              const when = start.toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: tz,
              });
              const summary = [
                `Tutor: ${lesson.tutorName || lesson.tutorId}`,
                `When (${tz}): ${when}`,
                `Duration: ${lesson.duration} min`,
                `Type: ${lesson.isTrial ? "Trial" : "Paid"}`,
                `Status: ${friendlyStatus}`,
                `Link: ${window.location.href}`,
              ].join("\n");
              try {
                await navigator.clipboard.writeText(summary);
                alert("Summary copied!");
              } catch {
                alert("Copy failed");
              }
            }}
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
          >
            Copy summary
          </button>

          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/tutors/${encodeURIComponent(
                    lesson.tutorId
                  )}`
                );
                alert("Tutor link copied!");
              } catch {
                alert("Copy failed");
              }
            }}
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
          >
            Copy tutor link
          </button>

          <button
            onClick={() => {
              const start = new Date(lesson.start);
              const dtstart =
                start
                  .toISOString()
                  .replace(/[-:]/g, "")
                  .split(".")[0] + "Z";
              const dtstamp =
                new Date()
                  .toISOString()
                  .replace(/[-:]/g, "")
                  .split(".")[0] + "Z";
              const url = `${window.location.origin}/student-lesson/${encodeURIComponent(
                lesson._id
              )}`;
              const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lernitt//StudentLesson//EN
BEGIN:VEVENT
UID:${lesson._id}@lernitt
SUMMARY:Lesson with ${lesson.tutorName || "Tutor"}
DTSTART:${dtstart}
DURATION:PT${lesson.duration}M
DESCRIPTION:${lesson.isTrial ? "Trial lesson" : "Paid lesson"}
DTSTAMP:${dtstamp}
LOCATION:Online
URL:${url}
END:VEVENT
END:VCALENDAR`;
              const blob = new Blob([ics], { type: "text/calendar" });
              const href = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = href;
              a.download = `lesson-${lesson._id}.ics`;
              a.click();
              URL.revokeObjectURL(href);
            }}
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm"
          >
            Add to calendar
          </button>
        </div>

        <p className="text-xs opacity-70 mt-1">
          Tip: You can reschedule or cancel from here. (Policies may
          apply.)
        </p>
      </div>
    </div>
  );
}
