// client/src/pages/MyLessons.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const MOCK = import.meta.env.VITE_MOCK === "1";

/* -------------------- helpers -------------------- */

// cents → € formatting
function euros(priceCentsOrEur) {
  const n = Number(priceCentsOrEur);
  if (!Number.isFinite(n)) return "0.00";
  return (n >= 1000 ? n / 100 : n).toFixed(2);
}

/* STUDENT-FACING STATUS TRANSLATION — NEW LIFECYCLE */
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

// Normalize lesson shape
function normalizeLesson(raw) {
  const id = raw._id || raw.id;
  const startISO = raw.start || raw.startTime || raw.begin;
  const price =
    typeof raw.price === "number" ? raw.price : Number(raw.price) || 0;

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
  };
}

function deriveStatus(l) {
  const started = new Date(l.start).getTime() <= Date.now();
  const translated = translateStatus(l.status);

  if (started && !["completed", "cancelled", "expired"].includes(translated)) {
    return "expired";
  }
  return translated;
}

/* -------------------- Components -------------------- */

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

/* -------------------- Page -------------------- */

export default function MyLessons() {
  const nav = useNavigate();
  const loc = useLocation();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const loggedIn = !!token;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
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
      setErr(e.message || "Could not load lessons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [loggedIn]);

  // back to top
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ----------- filtered list ----------- */
  const ordered = useMemo(() => {
    let arr = [...rows];

    arr.sort((a, b) => {
      const rank = (x) =>
        ["expired", "completed", "cancelled"].includes(deriveStatus(x)) ? 1 : 0;
      return rank(a) - rank(b);
    });

    if (statusFilter !== "all") {
      arr = arr.filter((l) => deriveStatus(l) === statusFilter);
    }

    if (hidePast) {
      arr = arr.filter(
        (l) =>
          !["expired", "completed", "cancelled"].includes(deriveStatus(l))
      );
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

  /* ----------- cancel lesson ----------- */
  async function cancelLesson(id) {
    if (MOCK) {
      alert("Cancel disabled in mock mode.");
      return;
    }
    if (!confirm("Cancel this lesson?")) return;

    try {
      await apiFetch(`/api/lessons/${id}/cancel`, {
        method: "PATCH",
        auth: true,
        body: { reason: "user-cancel" },
      });
      await load();
    } catch (e) {
      alert(e.message || "Cancel failed");
    }
  }

  /* -------------------- render -------------------- */

  if (!loggedIn) return <div className="p-4">Redirecting…</div>;

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
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs text-slate-500">
            <Link
              to="/tutors"
              className="inline-flex items-center gap-1 hover:underline"
            >
              ← Back to tutors
            </Link>
          </div>
          <h1 className="text-2xl font-bold">My lessons</h1>
          <p className="text-sm text-slate-600">
            See your upcoming and past lessons, join classes, and access
            recordings in one place.
          </p>
        </div>

        <Link
          to="/tutors"
          className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md"
        >
          Book a new lesson
        </Link>
      </div>

      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#eff6ff",
        }}
      >
        Times shown in your timezone: {tz}
      </div>

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

      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur">
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
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black text-sm"
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
              Hide past
            </label>

            <label className="text-sm flex items-center gap-1">
              <input
                type="checkbox"
                checked={onlyTrials}
                onChange={(e) => setOnlyTrials(e.target.checked)}
              />
              Only trials
            </label>

            <label className="text-sm flex items-center gap-2">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-2xl px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="pending_payment">Payment required</option>
                <option value="paid_waiting_tutor">
                  Paid — awaiting tutor
                </option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </label>

            <span className="text-xs opacity-70 ml-auto">
              Showing {ordered.length} lesson
              {ordered.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs opacity-80">
            <span className="opacity-60">Legend:</span>
            <StatusBadge status="pending_payment" />
            <StatusBadge status="paid_waiting_tutor" />
            <StatusBadge status="confirmed" />
            <StatusBadge status="completed" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="expired" />
            <StatusBadge isTrial />
          </div>
        </div>
      </div>

      {!err && ordered.length === 0 && (
        <div className="opacity-70">No lessons yet.</div>
      )}

      {!err && ordered.length > 0 && (
        <ul className="space-y-2">
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

            return (
              <li key={l._id} className="border rounded-2xl p-3">
                <Link
                  to={`/student-lesson/${l._id}`}
                  state={{ lesson: l }}
                  className="flex items-baseline gap-2 hover:underline"
                >
                  <div className="font-medium">{l.tutorName}</div>
                  <div className="text-xs opacity-70">
                    {start.toLocaleString()}
                    {end ? ` → ${end.toLocaleString()}` : ""}
                  </div>
                  <div className="ml-auto text-xs flex gap-2 items-center">
                    <StatusBadge status={status} isTrial={l.isTrial} />
                    {["pending_payment", "paid_waiting_tutor", "confirmed"].includes(
                      status
                    ) && <TinyCountdown to={l.start} />}
                  </div>
                </Link>

                <div className="text-xs opacity-70 mt-1">
                  {l.subject || "—"} · Price: € {euros(l.price)}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  {canPay && (
                    <Link
                      to={`/pay/${encodeURIComponent(l._id)}`}
                      className="text-sm border px-3 py-1 rounded-2xl"
                    >
                      Pay
                    </Link>
                  )}

                  {canCancel && (
                    <button
                      onClick={() => cancelLesson(l._id)}
                      className="text-sm border px-3 py-1 rounded-2xl"
                    >
                      Cancel
                    </button>
                  )}

                  <Link
                    to={`/tutors/${encodeURIComponent(l.tutorId)}`}
                    className="text-sm border px-3 py-1 rounded-2xl"
                  >
                    Tutor
                  </Link>

                  {isCompleted && (
                    <Link
                      to={`/lesson-recordings?lessonId=${encodeURIComponent(
                        l._id
                      )}`}
                      className="text-sm border px-3 py-1 rounded-2xl bg-blue-50 hover:bg-blue-100"
                    >
                      View Recordings
                    </Link>
                  )}

                  {/* NEW: Write review button → opens tutor profile review form */}
                  {isCompleted && (
                    <Link
                      to={`/tutors/${encodeURIComponent(
                        l.tutorId
                      )}?review=1`}
                      className="text-sm border px-3 py-1 rounded-2xl bg-amber-50 hover:bg-amber-100"
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

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 rounded-full shadow-lg border px-4 py-2 text-sm bg-white/90 hover:bg-white transition"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}
