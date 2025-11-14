// client/src/pages/BookingConfirmation.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API || "http://localhost:5000";

// Helper: download .ics file
function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// cents → € helper
function eurosFromPrice(p) {
  const n = typeof p === "number" ? p : Number(p) || 0;
  return n >= 1000 ? n / 100 : n;
}

// Normalize lifecycle status to our canonical set
function normalizeStatus(rawStatus, isTrial) {
  const s = (rawStatus || "").toString().toLowerCase();
  const allowed = ["booked", "paid", "confirmed", "completed", "cancelled", "expired"];

  if (allowed.includes(s)) return s;

  // Legacy "pending" → "booked"
  if (s === "pending" || !s) {
    return isTrial ? "confirmed" : "booked";
  }

  return s || "booked";
}

export default function BookingConfirmation() {
  const { lessonId } = useParams();
  const loc = useLocation();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [tutorTz, setTutorTz] = useState(null);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [copied, setCopied] = useState("");

  /* ----------------------------------------------------
     LOAD LESSON (always re-fetch from server)
  ---------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const r = await fetch(`${API}/api/lessons/${encodeURIComponent(lessonId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error(`Failed to load lesson (${r.status})`);

        const raw = await r.json();
        const isTrial = raw.isTrial || raw.kind === "trial";

        const normalized = {
          ...raw,
          start: raw.start || raw.startTime,
          duration:
            raw.duration ||
            ((raw.endTime && (raw.startTime || raw.start))
              ? (new Date(raw.endTime) - new Date(raw.startTime || raw.start)) / 60000
              : 60),
          isTrial,
        };

        normalized.status = normalizeStatus(normalized.status, isTrial);

        setLesson(normalized);
      } catch (e) {
        setError(e.message || "Failed to load lesson");
      }
    })();
  }, [lessonId]);

  /* ----------------------------------------------------
     LOAD TUTOR TIMEZONE
  ---------------------------------------------------- */
  useEffect(() => {
    if (!lesson?.tutor) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/availability/${encodeURIComponent(lesson.tutor)}`);
        const d = await r.json();
        setTutorTz(d?.timezone || null);
      } catch {
        setTutorTz(null);
      }
    })();
  }, [lesson?.tutor]);

  if (error) return <div style={{ padding: 16, color: "#b91c1c" }}>{error}</div>;
  if (!lesson)
    return (
      <div style={{ padding: 16 }}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-64 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );

  /* ----------------------------------------------------
     RENDER PREP
  ---------------------------------------------------- */
  const start = lesson?.start ? new Date(lesson.start) : null;

  const whenYour = start
    ? start.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: tz })
    : "—";

  const whenTutor =
    start && tutorTz
      ? start.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: tutorTz })
      : "";

  const status = normalizeStatus(lesson.status, !!lesson.isTrial);

  const isTrial = !!lesson.isTrial;
  const isBooked = status === "booked";
  const isPaid = status === "paid";
  const isConfirmed = status === "confirmed";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";
  const isExpired = status === "expired";
  const isTerminal = isCompleted || isCancelled || isExpired;

  const amountRaw =
    (typeof lesson?.amountCents === "number" && lesson.amountCents >= 0 && lesson.amountCents) ||
    (typeof lesson?.priceCents === "number" && lesson.priceCents >= 0 && lesson.priceCents) ||
    lesson?.price ||
    0;

  const amount = eurosFromPrice(amountRaw).toFixed(2);

  const dtstart = start ? start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z" : "";
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lessonUrl = `${window.location.origin}/student-lesson/${encodeURIComponent(lesson._id)}`;

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lernitt//Booking//EN
BEGIN:VEVENT
UID:${lesson._id}@lernitt
SUMMARY:Lesson with ${lesson.tutorName || "Tutor"}
${start ? `DTSTART:${dtstart}` : ""}
DURATION:PT${lesson.duration || 60}M
DESCRIPTION:${isTrial ? "Trial lesson" : "Paid lesson"}
DTSTAMP:${dtstamp}
LOCATION:Online
URL:${lessonUrl}
END:VEVENT
END:VCALENDAR`.trim();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied("Link copied!");
      setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("Copy failed");
      setTimeout(() => setCopied(""), 1200);
    }
  };

  const copySummary = async () => {
    const lines = [
      `Tutor: ${lesson.tutorName || lesson.tutor}`,
      `When (your time — ${tz}): ${whenYour}`,
      tutorTz ? `When (tutor time — ${tutorTz}): ${whenTutor}` : null,
      `Duration: ${lesson.duration || 60} min`,
      isTrial ? "Type: Trial (free)" : `Amount: € ${amount}`,
      `Status: ${status || "booked"}`,
      `Link: ${window.location.href}`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied("Summary copied!");
      setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("Copy failed");
      setTimeout(() => setCopied(""), 1200);
    }
  };

  const backToTutors =
    (loc.state?.from?.pathname || "/tutors") + (loc.state?.from?.search || "");

  const backToTutorHref = `/tutors/${lesson.tutor}${isTrial ? "?trial=1" : ""}`;

  // Headline text
  const headline = isTrial
    ? "Trial booked"
    : isConfirmed || isCompleted
    ? "Booking confirmed"
    : isPaid
    ? "Payment complete – waiting for tutor"
    : isCancelled
    ? "Booking cancelled"
    : isExpired
    ? "Booking expired"
    : "Booking pending";

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 12, fontSize: 14 }}>
        <b>1) Booked</b> →{" "}
        {isTrial ? (
          <b>2) Trial</b>
        ) : isPaid || isConfirmed || isCompleted ? (
          <b>2) Paid</b>
        ) : (
          "2) Pay"
        )}{" "}
        → <b>3) Confirmed</b>
      </div>

      {/* Back to tutors list */}
      <Link to={backToTutors} className="text-sm underline">
        ← Back to tutors
      </Link>

      {/* Main heading */}
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{headline}</h1>

      {/* Timezone bar */}
      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#eff6ff",
          marginBottom: 8,
        }}
      >
        Times are shown in your timezone: {tz}.
      </div>

      {/* Trial banner */}
      {isTrial && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#d1fae5",
            border: "1px solid #10b981",
            marginBottom: 12,
          }}
        >
          🎉 Trial booked! Your free 30-minute lesson is confirmed.
        </div>
      )}

      {/* Payment / status banners */}
      {!isTrial && isBooked && !isTerminal && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fef9c3",
            border: "1px solid #facc15",
            marginBottom: 12,
          }}
        >
          ⚠ Please complete payment to confirm this booking.
        </div>
      )}

      {!isTrial && isPaid && !isTerminal && !isConfirmed && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#e0f2fe",
            border: "1px solid #38bdf8",
            marginBottom: 12,
          }}
        >
          💳 Payment complete! Waiting for the tutor to confirm.
        </div>
      )}

      {isConfirmed && !isTerminal && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#dcfce7",
            border: "1px solid #22c55e",
            marginBottom: 12,
          }}
        >
          ✅ Your booking has been confirmed by the tutor.
        </div>
      )}

      {isCompleted && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#f6ffed",
            border: "1px solid #52c41a",
            marginBottom: 12,
          }}
        >
          🎓 This lesson has been completed.
        </div>
      )}

      {isCancelled && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff1f0",
            border: "1px solid #f87171",
            marginBottom: 12,
          }}
        >
          ❌ This booking was cancelled.
        </div>
      )}

      {isExpired && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#f3f4f6",
            border: "1px solid #9ca3af",
            marginBottom: 12,
          }}
        >
          ⏰ This booking has expired.
        </div>
      )}

      {/* Lesson details */}
      <div style={{ marginBottom: 12 }}>
        <div>
          <b>Tutor:</b>{" "}
          <Link to={backToTutorHref}>{lesson.tutorName || "Tutor"}</Link>
        </div>
        <div>
          <b>When (your time — {tz}):</b> {whenYour}
        </div>
        {tutorTz && (
          <div>
            <b>When (tutor time — {tutorTz}):</b> {whenTutor}
          </div>
        )}
        <div>
          <b>Duration:</b> {lesson.duration || 60} min
        </div>
        {!isTrial && (
          <div>
            <b>Amount:</b> € {amount}
          </div>
        )}
        {isTrial ? (
          <div style={{ marginTop: 8 }}>
            This is a <b>free 30-minute trial</b>. No payment needed.
          </div>
        ) : isBooked ? (
          <div style={{ marginTop: 8 }}>
            This lesson is <b>booked</b>. Please complete payment to confirm.
          </div>
        ) : isPaid && !isConfirmed ? (
          <div style={{ marginTop: 8 }}>
            Payment received. The lesson is <b>waiting for tutor confirmation</b>.
          </div>
        ) : isConfirmed ? (
          <div style={{ marginTop: 8 }}>
            This lesson is <b>confirmed</b>.
          </div>
        ) : isCompleted ? (
          <div style={{ marginTop: 8 }}>
            This lesson is <b>completed</b>.
          </div>
        ) : isCancelled ? (
          <div style={{ marginTop: 8 }}>
            This lesson was <b>cancelled</b>.
          </div>
        ) : isExpired ? (
          <div style={{ marginTop: 8 }}>
            This lesson has <b>expired</b>.
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Payment CTA */}
        {!isTrial && isBooked && !isTerminal && (
          <Link
            to={`/pay/${lesson._id}`}
            state={{ from: loc.state?.from || { pathname: "/tutors" } }}
            style={{
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
            }}
          >
            Go to Pay
          </Link>
        )}

        {/* Paid badge */}
        {!isTrial && isPaid && (
          <span
            style={{
              padding: "10px 14px",
              border: "1px solid #10b981",
              borderRadius: 10,
            }}
          >
            Paid ✔
          </span>
        )}

        {/* Go to My Lessons */}
        <Link
          to={`/my-lessons`}
          style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
        >
          Go to My Lessons
        </Link>

        {/* Reschedule / Cancel (only if not terminal) */}
        {!isTerminal && (
          <Link
            to={`/student-lesson/${lesson._id}`}
            style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
          >
            Reschedule
          </Link>
        )}

        {!isTerminal && (
          <Link
            to={`/student-lesson/${lesson._id}`}
            style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
          >
            Cancel
          </Link>
        )}

        {/* Back to tutor */}
        <Link
          to={backToTutorHref}
          style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
        >
          Back to Tutor
        </Link>

        {/* ICS + copy utilities */}
        <button
          onClick={() => downloadIcs(`lesson-${lesson._id}.ics`, ics)}
          style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
          disabled={!start}
        >
          Add to calendar (.ics)
        </button>

        <button
          onClick={copyLink}
          style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
        >
          Copy link
        </button>

        <button
          onClick={copySummary}
          style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
        >
          Copy summary
        </button>

        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`/tutors/${lesson.tutor}`);
              setCopied("Tutor link copied!");
              setTimeout(() => setCopied(""), 1200);
            } catch {
              setCopied("Copy failed");
              setTimeout(() => setCopied(""), 1200);
            }
          }}
          style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
        >
          Copy tutor link
        </button>

        {copied && <span style={{ fontSize: 12, opacity: 0.8 }}>{copied}</span>}
      </div>
    </div>
  );
}
