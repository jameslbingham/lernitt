// client/src/pages/BookingConfirmation.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API || "http://localhost:5000";

/* --------------------------- Helpers --------------------------- */

function euros(p) {
  const n = typeof p === "number" ? p : Number(p) || 0;
  return n >= 1000 ? (n / 100).toFixed(2) : n.toFixed(2);
}

function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Lifecycle Translation (A1) ---------------- */
// Map backend statuses → student-friendly lifecycle
// DB: booked (unpaid), paid (waiting tutor), confirmed, completed, cancelled, expired
function translateStatus(raw) {
  switch ((raw || "").toLowerCase()) {
    case "booked":               // unpaid booking
      return "pending_payment";
    case "pending":              // legacy / safety
      return "pending_payment";
    case "paid":                 // paid, waiting tutor confirm
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
      return "pending_payment";
  }
}

/* ----------------------------------------------------- */

export default function BookingConfirmation() {
  const { lessonId } = useParams();
  const loc = useLocation();

  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [tutorTz, setTutorTz] = useState(null);
  const [copied, setCopied] = useState("");

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // Read query params (for just-paid redirects)
  const search = new URLSearchParams(loc.search);
  const justPaid = search.get("paid") === "1";
  const providerParam = (search.get("provider") || "").toLowerCase();
  const provider =
    providerParam === "stripe" || providerParam === "paypal"
      ? providerParam
      : null;

  /* ----------------------- LOAD LESSON (+mark-paid) ----------------------- */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");

        // If coming back from payment success, mark the lesson as paid first
        if (justPaid && provider && token) {
          try {
            await fetch(`${API}/api/payments/${provider}/mark-paid`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ lessonId }),
            });
          } catch (e) {
            console.error("[BookingConfirmation] mark-paid failed:", e);
            // continue anyway; we will still load the lesson
          }
        }

        // Now load the lesson
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const r = await fetch(
          `${API}/api/lessons/${encodeURIComponent(lessonId)}`,
          { headers }
        );
        if (!r.ok) throw new Error(`Failed to load lesson (${r.status})`);

        const raw = await r.json();

        setLesson({
          ...raw,
          start: raw.start || raw.startTime,
          duration:
            raw.duration ||
            (raw.endTime && raw.startTime
              ? (new Date(raw.endTime) - new Date(raw.startTime)) / 60000
              : 60),
          isTrial: raw.isTrial || raw.kind === "trial",
          translatedStatus: translateStatus(raw.status),
        });
      } catch (e) {
        setError(e.message || "Failed to load lesson");
      }
    })();
    // re-run if lessonId or query string changes (e.g. from /confirm?paid=1)
  }, [lessonId, loc.search]);

  /* -------------------- Load tutor timezone ------------------- */
  useEffect(() => {
    if (!lesson?.tutor) return;
    (async () => {
      try {
        const r = await fetch(
          `${API}/api/availability/${encodeURIComponent(lesson.tutor)}`
        );
        const d = await r.json();
        setTutorTz(d?.timezone || null);
      } catch {
        setTutorTz(null);
      }
    })();
  }, [lesson?.tutor]);

  /* --------------------------- Rendering Prep --------------------------- */

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

  const status = lesson.translatedStatus;
  const start = lesson.start ? new Date(lesson.start) : null;

  const whenYour = start
    ? start.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: tz,
      })
    : "—";

  const whenTutor =
    start && tutorTz
      ? start.toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: tutorTz,
        })
      : "";

  const isConfirmed = status === "confirmed" || status === "completed";
  const isTerminal = ["completed", "cancelled", "expired"].includes(status);

  const amount = euros(
    lesson.amountCents ?? lesson.priceCents ?? lesson.price ?? 0
  );

  const dtstart = start
    ? start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : "";
  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";

  const lessonUrl = `${window.location.origin}/student-lesson/${encodeURIComponent(
    lesson._id
  )}`;

  const ics = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lernitt//Booking//EN
BEGIN:VEVENT
UID:${lesson._id}@lernitt
SUMMARY:Lesson with ${lesson.tutorName || "Tutor"}
${start ? `DTSTART:${dtstart}` : ""}
DURATION:PT${lesson.duration || 60}M
DESCRIPTION:${lesson.isTrial ? "Trial lesson" : "Paid lesson"}
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
      `When (${tz}): ${whenYour}`,
      tutorTz ? `When (${tutorTz}): ${whenTutor}` : null,
      `Duration: ${lesson.duration} min`,
      lesson.isTrial ? "Type: Trial (free)" : `Amount: € ${amount}`,
      `Status: ${status}`,
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
    (loc.state?.from?.pathname || "/tutors") +
    (loc.state?.from?.search || "");

  const backToTutorHref = `/tutors/${lesson.tutor}${
    lesson.isTrial ? "?trial=1" : ""
  }`;

  /* --------------------------- RENDER --------------------------- */

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {/* Progress path */}
      <div style={{ marginBottom: 12, fontSize: 14 }}>
        <b>1) Reserved</b> →{" "}
        {lesson.isTrial ? (
          <b>2) Trial</b>
        ) : status === "pending_payment" ? (
          "2) Pay"
        ) : (
          <b>2) Paid</b>
        )}{" "}
        → <b>3) Confirmed</b>
      </div>

      <Link to={backToTutors} className="text-sm underline">
        ← Back to tutors
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        {lesson.isTrial
          ? "Trial booked"
          : status === "pending_payment"
          ? "Booking pending"
          : status === "paid_waiting_tutor"
          ? "Payment complete — awaiting tutor"
          : isConfirmed
          ? "Booking confirmed"
          : isTerminal
          ? "Lesson finished"
          : "Booking details"}
      </h1>

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
        Times shown in your timezone: {tz}.
      </div>

      {/* Trial banner */}
      {lesson.isTrial && (
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

      {/* Payment pending */}
      {!lesson.isTrial && status === "pending_payment" && (
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

      {/* Payment done, waiting tutor */}
      {!lesson.isTrial && status === "paid_waiting_tutor" && (
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
          <b>Duration:</b> {lesson.duration} min
        </div>

        {!lesson.isTrial && (
          <div>
            <b>Amount:</b> € {amount}
          </div>
        )}
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
        {!lesson.isTrial && status === "pending_payment" && (
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

        {!lesson.isTrial && status === "paid_waiting_tutor" && (
          <span
            style={{
              padding: "10px 14px",
              border: "1px solid #38bdf8",
              background: "#e0f2fe",
              borderRadius: 10,
            }}
          >
            Paid ✔ Waiting tutor confirmation
          </span>
        )}

        <Link
          to="/my-lessons"
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          Go to My Lessons
        </Link>

        <Link
          to={`/student-lesson/${lesson._id}`}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          Manage lesson
        </Link>

        <Link
          to={backToTutorHref}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          Back to Tutor
        </Link>

        <button
          onClick={() => downloadIcs(`lesson-${lesson._id}.ics`, ics)}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          Add to calendar
        </button>

        <button
          onClick={copyLink}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          Copy link
        </button>

        <button
          onClick={copySummary}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          Copy summary
        </button>

        {copied && (
          <span style={{ fontSize: 12, opacity: 0.8 }}>{copied}</span>
        )}
      </div>
    </div>
  );
}
