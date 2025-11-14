// client/src/pages/TutorLessons.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  listTutorLessons,
  approveBooking,
  rejectBooking,
  confirmPaidLesson,
  completeLesson,
  approveReschedule,
  rejectReschedule,
  expireOverdue,
} from "../api/tutorLessons.js";

/* -------------------- STATUS MAP -------------------- */

const STATUS_LABEL = {
  booked: "Waiting for tutor approval",
  pending: "Approved (waiting for student payment)",
  paid: "Paid (awaiting your confirmation)",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  reschedule_requested: "Reschedule requested",
};

function StatusBadge({ s }) {
  const map = {
    booked: "bg-yellow-100 text-yellow-800",
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-gray-200 text-gray-700",
    reschedule_requested: "bg-purple-100 text-purple-800",
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-2xl ${map[s] || "bg-gray-100"}`}>
      {STATUS_LABEL[s] || s}
    </span>
  );
}

/* -------------------- Helpers -------------------- */

function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

function getStart(lesson) {
  const iso = lesson.start || lesson.startISO || lesson.begin;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function TinyCountdown({ to }) {
  const [left, setLeft] = useState(() => (to ? new Date(to).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!to) return;
    const id = setInterval(() => setLeft(new Date(to).getTime() - Date.now()), 1000);
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

/* -------------------- PAGE -------------------- */

export default function TutorLessons() {
  const [lessons, setLessons] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  /* load lessons */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLessons(await listTutorLessons());
      } catch (e) {
        setError(e.message || "Load failed");
      } finally {
        setLoading(false);
      }
    })();

    const id = setInterval(() => setLessons((p) => [...p]), 30_000);
    return () => clearInterval(id);
  }, []);

  /* filtering */
  const filtered = useMemo(() => {
    let arr =
      filter === "all" ? lessons : lessons.filter((l) => l.status === filter);

    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter((l) =>
        `${l.student || ""} ${l.subject || ""}`.toLowerCase().includes(t)
      );
    }

    return [...arr].sort((a, b) => {
      const ad = getStart(a);
      const bd = getStart(b);
      return ad && bd ? ad - bd : 0;
    });
  }, [filter, q, lessons]);

  /* actions */
  const doApprove = async (id) => {
    try {
      setLessons(await approveBooking(id));
    } catch (e) {
      setError(e.message || "Approve failed");
    }
  };

  const doReject = async (id) => {
    try {
      setLessons(await rejectBooking(id));
    } catch (e) {
      setError(e.message || "Reject failed");
    }
  };

  const doConfirmPaid = async (id) => {
    try {
      setLessons(await confirmPaidLesson(id));
    } catch (e) {
      setError(e.message || "Confirm failed");
    }
  };

  const doComplete = async (id) => {
    try {
      setLessons(await completeLesson(id));
    } catch (e) {
      setError(e.message || "Complete failed");
    }
  };

  const doApproveResched = async (id) => {
    try {
      setLessons(await approveReschedule(id));
    } catch (e) {
      setError(e.message || "Approve failed");
    }
  };

  const doRejectResched = async (id) => {
    try {
      setLessons(await rejectReschedule(id));
    } catch (e) {
      setError(e.message || "Reject failed");
    }
  };

  const doExpire = async () => {
    try {
      setLessons(await expireOverdue());
    } catch (e) {
      setError(e.message || "Expire failed");
    }
  };

  /* ------------------ Render ------------------ */

  if (loading) {
    return (
      <div className="p-4">Loading…</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Lessons</h1>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded-2xl" onClick={doExpire}>
            Expire overdue
          </button>
          <Link to="/availability" className="text-sm underline">
            ← Back
          </Link>
        </div>
      </div>

      {/* timezone */}
      <div className="text-xs border p-2 rounded bg-blue-50">
        Times shown in your timezone: {tz}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* filters */}
      <div className="sticky top-0 bg-white py-2 border-b">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="border p-2 rounded-2xl text-sm w-full mb-2"
        />

        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["all", "All"],
            ["booked", "Booked"],
            ["pending", "Awaiting payment"],
            ["paid", "Paid"],
            ["confirmed", "Confirmed"],
            ["completed", "Completed"],
            ["cancelled", "Cancelled"],
            ["expired", "Expired"],
            ["reschedule_requested", "Reschedule"],
          ].map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1 rounded-2xl border ${
                filter === k ? "bg-black text-white" : "bg-white"
              }`}
            >
              {lbl}
            </button>
          ))}

          <span className="ml-auto text-xs opacity-60 self-center">
            Showing {filtered.length}
          </span>
        </div>
      </div>

      {/* LIST */}
      <div className="grid gap-2">
        {filtered.map((l) => {
          const start = getStart(l);
          const showCountdown = ["booked", "pending", "paid", "confirmed"].includes(l.status);

          return (
            <div
              key={l.id || l._id}
              className="border rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {/* left side */}
              <div className="flex-1">
                <div className="font-semibold">
                  {start ? start.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: tz }) : ""}
                  <span className="opacity-70"> with </span>
                  {l.student}
                  {showCountdown && start && (
                    <TinyCountdown to={start.toISOString()} />
                  )}
                </div>

                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <StatusBadge s={l.status} />

                  {l.subject && (
                    <span className="text-xs opacity-70">{l.subject} · € {euros(l.price)}</span>
                  )}

                  {l.status === "reschedule_requested" && (
                    <span className="text-xs">
                      Requested: {l.requestedNewDate} {l.requestedNewTime}
                    </span>
                  )}
                </div>
              </div>

              {/* actions */}
              <div className="flex gap-2 flex-wrap">
                {/* BOOKED → approve or reject */}
                {l.status === "booked" && (
                  <>
                    <button className="px-3 py-1 border rounded-2xl" onClick={() => doApprove(l.id)}>
                      Approve
                    </button>
                    <button className="px-3 py-1 border rounded-2xl" onClick={() => doReject(l.id)}>
                      Reject
                    </button>
                  </>
                )}

                {/* PAID → tutor must confirm */}
                {l.status === "paid" && (
                  <button className="px-3 py-1 border rounded-2xl" onClick={() => doConfirmPaid(l.id)}>
                    Confirm booking
                  </button>
                )}

                {/* RESCHEDULE REQUEST */}
                {l.status === "reschedule_requested" && (
                  <>
                    <button className="px-3 py-1 border rounded-2xl" onClick={() => doApproveResched(l.id)}>
                      Approve change
                    </button>
                    <button className="px-3 py-1 border rounded-2xl" onClick={() => doRejectResched(l.id)}>
                      Keep original
                    </button>
                  </>
                )}

                {/* CONFIRMED → mark complete */}
                {l.status === "confirmed" && (
                  <button className="px-3 py-1 border rounded-2xl" onClick={() => doComplete(l.id)}>
                    Mark complete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs opacity-50">
        Note: Mock mode disables real approvals.
      </div>
    </div>
  );
}
