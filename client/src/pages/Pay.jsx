// client/src/pages/Pay.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

// cents → € fallback helper
function eurosFromPrice(p) {
  const n = typeof p === "number" ? p : Number(p) || 0;
  return n >= 1000 ? n / 100 : n;
}

export default function Pay() {
  const { lessonId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  /* ----------------------------------------------------------
     LOAD LESSON + NORMALISE
  ---------------------------------------------------------- */
  async function loadLesson() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API}/api/lessons/${encodeURIComponent(lessonId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`Failed to load lesson (${r.status})`);

      const data = await r.json();

      const normalized = {
        ...data,
        start: data.start || data.startTime,
        duration:
          data.duration ||
          (data.endTime && data.startTime
            ? (new Date(data.endTime) - new Date(data.startTime)) / 60000
            : 60),
        isTrial: data.isTrial || data.kind === "trial",
      };

      // Trials do not pay — redirect straight to confirmation page
      if (normalized.isTrial) {
        nav(`/confirm/${encodeURIComponent(lessonId)}`, {
          replace: true,
          state: { from: loc.state?.from || { pathname: "/tutors" } },
        });
        return;
      }

      setLesson(normalized);
    } catch (e) {
      setError(e.message || "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const status = (lesson?.status || "").toLowerCase();

  // Student-friendly rule:
  // They only see “Already paid” if status === "paid" or "confirmed" or "completed"
  const isAlreadyPaid =
    status === "paid" || status === "confirmed" || status === "completed";

  /* ----------------------------------------------------------
     START CHECKOUT
  ---------------------------------------------------------- */
  async function startPayment(provider) {
    try {
      setPaying(true);
      setError("");

      if (MOCK) {
        // simulate payment success → redirect
        setTimeout(() => {
          alert(`MOCK: ${provider} payment succeeded.`);
          nav(`/confirm/${encodeURIComponent(lessonId)}`, {
            replace: true,
            state: { from: loc.state?.from || { pathname: "/tutors" } },
          });
        }, 600);
        return;
      }

      const token = localStorage.getItem("token");
      const r = await fetch(`${API}/api/payments/${provider}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ lessonId }),
      });

      if (!r.ok) throw new Error(`Failed to start ${provider} checkout`);
      const data = await r.json();

      // Stripe
      if (provider === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }

      // PayPal
      if (provider === "paypal" && (data.approvalUrl || data.url)) {
        window.location.href = data.approvalUrl || data.url;
        return;
      }

      throw new Error("Unexpected checkout payload");
    } catch (e) {
      setError(e.message || "Payment failed to start");
      setPaying(false);
    }
  }

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  if (error && !lesson) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>
        <button
          onClick={loadLesson}
          style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 10 }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!lesson) return null;

  const start = lesson.start ? new Date(lesson.start) : null;
  const when = start
    ? start.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const amountRaw =
    (typeof lesson.amountCents === "number" && lesson.amountCents >= 0 && lesson.amountCents) ||
    (typeof lesson.priceCents === "number" && lesson.priceCents >= 0 && lesson.priceCents) ||
    lesson.price ||
    0;

  const amount = eurosFromPrice(amountRaw).toFixed(2);

  const tutorId =
    typeof lesson.tutor === "string"
      ? lesson.tutor
      : lesson.tutor?._id || "";
  const tutorName = lesson.tutorName || lesson.tutor?.name || "Tutor";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {/* Progress header */}
      <div style={{ marginBottom: 12, fontSize: 14 }}>
        <b>1) Reserved</b> → {isAlreadyPaid ? <b>2) Paid</b> : <b>2) Pay</b>} → 3) Confirmed
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Pay for lesson</h1>

      {/* Lesson summary */}
      <div style={{ marginBottom: 12 }}>
        <div>
          <b>Tutor:</b>{" "}
          {tutorId ? (
            <Link to={`/tutors/${encodeURIComponent(tutorId)}`}>
              {tutorName}
            </Link>
          ) : (
            tutorName
          )}
        </div>

        <div><b>When:</b> {when}</div>
        <div><b>Duration:</b> {lesson.duration} min</div>
        <div><b>Amount:</b> € {amount}</div>

        {isAlreadyPaid && (
          <div style={{ marginTop: 8, color: "#065f46" }}>
            This lesson is already <b>paid</b>.  
            Waiting for the tutor to approve.
          </div>
        )}
      </div>

      {/* NEW HEADING — Choose payment method */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        Choose your payment method
      </h2>

      {/* Payment buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {!isAlreadyPaid && (
          <>
            <button
              disabled={paying}
              onClick={() => startPayment("stripe")}
              style={{
                padding: "10px 14px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                cursor: paying ? "not-allowed" : "pointer",
                opacity: paying ? 0.6 : 1,
              }}
            >
              {paying
                ? "Starting Stripe…"
                : "Pay with credit / debit card (Stripe)"}
            </button>

            <button
              disabled={paying}
              onClick={() => startPayment("paypal")}
              style={{
                padding: "10px 14px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                cursor: paying ? "not-allowed" : "pointer",
                opacity: paying ? 0.6 : 1,
              }}
            >
              {paying ? "Starting PayPal…" : "Pay with PayPal"}
            </button>
          </>
        )}

        {isAlreadyPaid && (
          <span
            style={{
              padding: "10px 14px",
              border: "1px solid #10b981",
              borderRadius: 10,
              color: "#065f46",
            }}
          >
            Paid ✔ — Waiting tutor confirmation
          </span>
        )}

        <Link
          to={`/confirm/${lessonId}`}
          state={{ from: loc.state?.from || { pathname: "/tutors" } }}
          style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10 }}
        >
          Back to confirmation
        </Link>
      </div>

      {/* Non-fatal error */}
      {error && lesson && (
        <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
      )}

      {MOCK && !isAlreadyPaid && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          MOCK MODE: Checkout is simulated. Buttons auto-complete payment.
        </div>
      )}
    </div>
  );
}
