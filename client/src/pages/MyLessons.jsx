// client/src/pages/MyLessons.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx"; // Needed for Reputation Badge and Credits

const MOCK = import.meta.env.VITE_MOCK === "1";

/* -------------------------------------------------------------------------- */
/* HELPERS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Formats currency values (cents or euros) into a standard € string.
 * Supports Lernitt's dual-format pricing legacy.
 */
function euros(priceCentsOrEur) {
  const n = Number(priceCentsOrEur);
  if (!Number.isFinite(n)) return "0.00";
  // If the number is large, assume it's cents and convert to EUR
  return (n >= 1000 ? n / 100 : n).toFixed(2);
}

/**
 * Maps raw backend lesson statuses to student-friendly lifecycle labels.
 */
function translateStatus(raw) {
  switch (raw) {
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
    default:
      return raw || "pending_payment";
  }
}

/**
 * Normalizes disparate lesson object shapes into a standard format used by the UI.
 */
function normalizeLesson(raw) {
  const id = raw._id || raw.id;
  const startISO = raw.start || raw.startTime || raw.begin;
  const price =
    typeof raw.price === "number" ? raw.price : Number(raw.price) || 0;

  // Calculate duration based on start/end if the field is missing
  const duration =
    Number(
      raw.duration ||
        (raw.endTime
          ? (new Date(raw.endTime) - new Date(startISO)) / 60000
          : 0)
    ) || 0;

  const tutorId = String(raw.tutorId || raw.tutor?._id || raw.tutor || "");
  const tutorName = raw.tutorName || raw.tutor?.name || "Tutor";

  return {
    _id: id,
    start: startISO,
    duration,
    status: raw.status,
    isTrial: !!raw.isTrial,
    price,
    tutorId,
    tutorName,
    subject: raw.subject || "",
    // italki-style package metadata
    isPackage: !!raw.isPackage,
    packageSize: raw.packageSize || 1
  };
}

/**
 * Applies time-based expiration rules on top of the translated status.
 * Ensures that past lessons not marked 'completed' correctly show as 'expired'.
 */
function deriveStatus(l) {
  const now = Date.now();
  const startMs = new Date(l.start).getTime();
  const durationMs = (l.duration || 0) * 60000;
  const ended = now > (startMs + durationMs);
  const translated = translateStatus(l.status);

  if (ended && !["completed", "cancelled", "expired"].includes(translated)) {
    return "expired";
  }
  return translated;
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Visual badge indicating the current state of a lesson booking.
 */
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
    pending_payment: {
      label: "Payment required",
      bg: "#fff7e6",
      color: "#ad6800",
    },
    paid_waiting_tutor: {
      label: "Paid — awaiting tutor",
      bg: "#e6f7ff",
      color: "#0050b3",
    },
    confirmed: { label: "Confirmed", bg: "#e6fffb", color: "#006d75" },
    reschedule_requested: {
      label: "Reschedule requested",
      bg: "#f0f5ff",
      color: "#1d39c4",
    },
    completed: { label: "Completed", bg: "#f6ffed", color: "#237804" },
    cancelled: { label: "Cancelled", bg: "#fff1f0", color: "#a8071a" },
    expired: { label: "Expired", bg: "#fafafa", color: "#595959" },
  };

  const s = map[status] || map.pending_payment;

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

/**
 * Real-time countdown timer for upcoming lessons.
 */
function TinyCountdown({ to }) {
  const [left, setLeft] = useState(() => new Date(to).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(
      () => setLeft(new Date(to).getTime() - Date.now()),
      1000
    );
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

// =============================================================================
// NEW: UPDATED AUTHORITATIVE STUDENT LEARNING DASHBOARD
// =============================================================================
/**
 * Top-level dashboard summary showing real credit balances and reputation.
 * Merged to pull from the authoritative 'user.packageCredits' source.
 */
function LearningDashboard({ user }) {
  // ✅ AUTH-BASED CALCULATION: Summing real credits from the user profile
  const packageCredits = user?.packageCredits || [];
  const totalRemaining = packageCredits.reduce((acc, curr) => acc + (curr.count || 0), 0);
  
  const hasCredits = totalRemaining > 0;
  const level = user?.proficiencyLevel || user?.placementTest?.level || "none";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* 1. CREDIT TRACKER */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">Pre-paid Balance</h3>
            <p className="text-2xl font-black text-slate-900">{totalRemaining} sessions available</p>
            
            {/* Show a mini breakdown by tutor if credits exist */}
            {hasCredits && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {packageCredits.filter(c => c.count > 0).map((c, idx) => (
                  <span key={idx} className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {c.count} session{c.count > 1 ? 's' : ''} left
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
            {totalRemaining}
          </div>
        </div>
        
        {hasCredits ? (
          <Link 
            to="/tutors" 
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
          >
            Schedule Next Session
          </Link>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 italic">No active packages. Book a 5-lesson bundle to save.</p>
            <Link to="/tutors" className="text-xs text-indigo-600 font-bold hover:underline">Browse tutors →</Link>
          </div>
        )}
      </div>

      {/* 2. REPUTATION BADGE (Linguistic DNA) */}
      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/30 p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-1">Global Proficiency</h3>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-white shadow-lg shadow-amber-200">
            {level === "none" ? "?" : level}
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-tight">
              {level === "none" ? "Assessment Pending" : `CEFR Level: ${level}`}
            </p>
            <p className="text-[11px] text-slate-500 mb-2">Based on your Lernitt DNA Assessment</p>
            <Link to="/placement-test" className="text-xs text-amber-700 underline font-black">
              {level === "none" ? "Take free assessment →" : "View DNA Profile →"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE LOGIC                                   */
/* -------------------------------------------------------------------------- */

export default function MyLessons() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth(); // Access user context for real-time credit tracking

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const loggedIn = !!token;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ LIVE time state used to refresh Join button visibility every 30 seconds
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000); 
    return () => clearInterval(id);
  }, []);

  // UI Filter states
  const [hidePast, setHidePast] = useState(false);
  const [onlyTrials, setOnlyTrials] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTop, setShowTop] = useState(false);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  /* ----------- load lessons ----------- */
  async function load() {
    if (!loggedIn) {
      const next = encodeURIComponent(loc.pathname + loc.search);
      nav(`/login?next=${next}`, { replace: true });
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const list = await apiFetch("/api/lessons/mine", { auth: true });
      const normalized = list.map(normalizeLesson);
      setRows(normalized);
    } catch (e) {
      setErr(e.message || "Could not sync your lesson history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [loggedIn]);

  // Back to top observer
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ----------- filtered list processing ----------- */
  const ordered = useMemo(() => {
    let arr = [...rows];

    // Priority sorting: active/upcoming lessons at the top
    arr.sort((a, b) => {
      const rank = (x) =>
        ["expired", "completed", "cancelled"].includes(deriveStatus(x)) ? 1 : 0;
      return rank(a) - rank(b);
    });

    // Apply sidebar status filters
    if (statusFilter !== "all") {
      arr = arr.filter((l) => deriveStatus(l) === statusFilter);
    }

    // Filter past lessons
    if (hidePast) {
      arr = arr.filter(
        (l) =>
          !["expired", "completed", "cancelled"].includes(deriveStatus(l))
      );
    }

    // Trial lesson filter
    if (onlyTrials) {
      arr = arr.filter((l) => l.isTrial);
    }

    // Keyword search (Tutor name or lesson subject)
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

  /* ----------- cancel lesson handler ----------- */
  async function cancelLesson(id) {
    if (MOCK) {
      alert("Cancel disabled in mock mode.");
      return;
    }
    if (!confirm("Are you sure you want to cancel this lesson?")) return;

    try {
      await apiFetch(`/api/lessons/${id}/cancel`, {
        method: "PATCH",
        auth: true,
        body: { reason: "user-cancel" },
      });
      await load();
    } catch (e) {
      alert(e.message || "Cancellation failed. Contact support if this persists.");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* RENDER                                  */
  /* ------------------------------------------------------------------------ */

  if (!loggedIn) return <div className="p-4">Authenticating session…</div>;

  if (loading)
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <h1 className="h-8 w-40 bg-gray-200 rounded-lg mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-3xl p-5 space-y-3">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-72 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs text-slate-500">
            <Link
              to="/tutors"
              className="inline-flex items-center gap-1 hover:underline font-medium"
            >
              ← Back to tutors marketplace
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Notebook</h1>
          <p className="text-sm text-slate-500">
            View upcoming sessions, pre-paid credits, and your learning history in one place.
          </p>
        </div>

        <Link
          to="/tutors"
          className="hidden sm:inline-block text-sm border-2 border-slate-900 bg-slate-900 text-white px-5 py-2 rounded-2xl font-bold shadow-sm hover:bg-white hover:text-slate-900 transition-all"
        >
          Book a Lesson
        </Link>
      </div>

      {/* AUTHORITATIVE LEARNING DASHBOARD */}
      <LearningDashboard user={user} />

      <div
        className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border border-blue-100 rounded-xl bg-blue-50 text-blue-600 inline-block"
      >
        Local Timezone: {tz}
      </div>

      {MOCK && (
        <div
          className="bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-2xl p-3 text-sm font-medium"
        >
          🚀 <strong>Developer Node:</strong> Mock mode is active. Payments are simulated and confirmed instantly.
        </div>
      )}

      {err && (
        <div className="text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 font-bold flex items-center justify-between">
          <span>{err}</span>
          <button
            onClick={load}
            className="border-2 border-red-600 px-4 py-1 rounded-xl text-xs uppercase"
          >
            Force Sync
          </button>
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 px-4 py-4 border-b bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by tutor or lesson subject…"
              className="border-2 border-slate-100 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-sm w-full pr-10 transition-colors outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black font-black"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hidePast}
                onChange={(e) => setHidePast(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              HIDE PAST
            </label>

            <label className="text-xs font-bold text-slate-600 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyTrials}
                onChange={(e) => setOnlyTrials(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              ONLY TRIALS
            </label>

            <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
              STATUS:
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border-2 border-slate-100 rounded-xl px-2 py-1 text-xs font-black outline-none"
              >
                <option value="all">ALL SESSIONS</option>
                <option value="pending_payment">UNPAID</option>
                <option value="paid_waiting_tutor">PRE-PAID</option>
                <option value="confirmed">CONFIRMED</option>
                <option value="completed">COMPLETED</option>
                <option value="cancelled">CANCELLED</option>
                <option value="expired">EXPIRED</option>
              </select>
            </label>

            <span className="text-[10px] font-black uppercase text-slate-400 ml-auto tracking-tighter">
              Displaying {ordered.length} session{ordered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {!err && ordered.length === 0 && (
        <div className="text-center py-24 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
          <p className="text-slate-400 font-bold">No sessions match your current selection.</p>
          <Link to="/tutors" className="text-indigo-600 text-sm underline mt-2 inline-block">Book a new session now</Link>
        </div>
      )}

      {!err && ordered.length > 0 && (
        <ul className="space-y-3">
          {ordered.map((l) => {
            const start = new Date(l.start);
            const end =
              isFinite(l.duration) && l.duration > 0
                ? new Date(start.getTime() + l.duration * 60000)
                : null;

            const status = deriveStatus(l);
            const canPay = !MOCK && status === "pending_payment" && !l.isTrial;
            const canCancel =
              !MOCK &&
              ["pending_payment", "paid_waiting_tutor", "confirmed"].includes(
                status
              );

            const isCompleted = status === "completed";

            // Logic: 10-minute buffer logic for Join button
            const startMs = start.getTime();
            const joinBufferMs = 10 * 60 * 1000; 
            const canJoin = (now >= startMs - joinBufferMs) && (now <= (end?.getTime() || 0)) && 
                          (status === "confirmed" || status === "paid_waiting_tutor");

            return (
              <li key={l._id} className="group border-2 border-slate-50 rounded-[32px] p-5 bg-white hover:border-indigo-100 transition-all shadow-sm hover:shadow-lg">
                <Link
                  to={`/student-lesson/${l._id}`}
                  state={{ lesson: l }}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-4"
                >
                  <div className="font-black text-slate-900 text-xl group-hover:text-indigo-600 transition-colors">{l.tutorName}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    {start.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    {end ? ` → ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ""}
                  </div>
                  <div className="sm:ml-auto flex items-center gap-2">
                    <StatusBadge status={status} isTrial={l.isTrial} />
                    {["pending_payment", "paid_waiting_tutor", "confirmed"].includes(
                      status
                    ) && <TinyCountdown to={l.start} />}
                  </div>
                </Link>

                <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">
                  <span>{l.subject || "Academic Discussion"}</span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                  <span>Price: €{euros(l.price)}</span>
                </div>

                <div className="flex gap-2 flex-wrap border-t border-slate-50 pt-5">
                  {/* JOIN BUTTON */}
                  {canJoin && (
                    <Link
                      to={`/video-lesson?lessonId=${l._id}`}
                      className="text-xs border-2 border-indigo-600 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      JOIN CLASSROOM
                    </Link>
                  )}

                  {/* PAYMENT BUTTON */}
                  {canPay && (
                    <Link
                      to={`/pay/${encodeURIComponent(l._id)}`}
                      className="text-xs border-2 border-slate-900 bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-white hover:text-slate-900 transition-all active:scale-95"
                    >
                      COMPLETE PAYMENT
                    </Link>
                  )}

                  {/* CANCELLATION BUTTON */}
                  {canCancel && (
                    <button
                      onClick={() => cancelLesson(l._id)}
                      className="text-xs border-2 border-slate-100 px-5 py-2.5 rounded-2xl font-black text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
                    >
                      CANCEL
                    </button>
                  )}

                  <Link
                    to={`/tutors/${encodeURIComponent(l.tutorId)}`}
                    className="text-xs border-2 border-slate-100 px-5 py-2.5 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    VIEW TUTOR
                  </Link>

                  {/* POST-LESSON ACTIONS */}
                  {isCompleted && (
                    <Link
                      to={`/lesson-recordings?lessonId=${encodeURIComponent(
                        l._id
                      )}`}
                      className="text-xs border-2 border-blue-600 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-blue-700 transition-all"
                    >
                      VIEW RECORDING
                    </Link>
                  )}

                  {isCompleted && (
                    <Link
                      to={`/tutors/${encodeURIComponent(
                        l.tutorId
                      )}?review=1`}
                      className="text-xs border-2 border-amber-500 bg-amber-500 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-amber-600 transition-all"
                    >
                      WRITE REVIEW
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-16 pb-10 flex flex-col items-center gap-6">
        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-10 right-10 rounded-full shadow-2xl border-2 border-slate-900 h-14 w-14 flex items-center justify-center bg-white hover:bg-slate-900 hover:text-white transition-all z-50 group"
          >
            <span className="font-black text-xl group-hover:-translate-y-1 transition-transform">↑</span>
          </button>
        )}
        
        {/* Notebook Branding */}
        <div className="text-center opacity-10 select-none pointer-events-none">
          <div className="text-5xl font-black tracking-tighter">LERNITT ACADEMY</div>
          <div className="text-[10px] font-bold uppercase tracking-[1.5em] mt-3">Notebook Dashboard v.2.6</div>
        </div>
      </div>
    </div>
  );
}
