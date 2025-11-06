// client/src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

const MOCK = import.meta.env.VITE_MOCK === "1";

function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

export default function Home() {
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const { isAuthed } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [upcoming, setUpcoming] = useState(null);
  const [notifUnread, setNotifUnread] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [tutorPeek, setTutorPeek] = useState([]);

  // Load local favourites count
  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("favTutors") || "[]");
      setFavCount(Array.isArray(ids) ? ids.length : 0);
    } catch {
      setFavCount(0);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");

      try {
        if (isAuthed) {
          const ns = await apiFetch("/api/notifications", { auth: true });
          if (alive) {
            const unread = Array.isArray(ns) ? ns.filter((n) => !n.read).length : 0;
            setNotifUnread(unread);
          }
        } else {
          setNotifUnread(0);
        }

        if (isAuthed) {
          const lessons = await apiFetch("/api/lessons/mine", { auth: true });
          if (alive) {
            const rows = (Array.isArray(lessons) ? lessons : []).filter(Boolean);
            rows.sort(
              (a, b) =>
                new Date(a.start || a.startTime || 0) - new Date(b.start || b.startTime || 0)
            );
            setUpcoming(
              rows.find((l) => new Date(l.start || l.startTime || 0) > new Date()) || null
            );
          }
        } else {
          setUpcoming(null);
        }

        try {
          const res = await apiFetch("/api/tutors?page=1&limit=6");
          const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
          if (alive) setTutorPeek(list.slice(0, 6));
        } catch {
          if (alive) setTutorPeek([]);
        }
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load home data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAuthed]);

  const nextLesson = useMemo(() => {
    if (!upcoming) return null;
    const startISO = upcoming.start || upcoming.startTime || upcoming.begin;
    const start = startISO ? new Date(startISO) : null;
    const when = start
      ? start.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
      : "—";
    const tutorName = upcoming.tutorName || upcoming.tutor?.name || "Tutor";
    const id = upcoming._id || upcoming.id;
    const tutorId = String(upcoming.tutorId || upcoming.tutor?._id || upcoming.tutor || "");
    return {
      id,
      tutorName,
      tutorId,
      when,
      duration:
        Number(
          upcoming.duration ||
            (upcoming.endTime ? (new Date(upcoming.endTime) - new Date(startISO)) / 60000 : 0)
        ) || 0,
      isTrial: !!upcoming.isTrial,
      price: typeof upcoming.price === "number" ? upcoming.price : Number(upcoming.price) || 0,
      status: (upcoming.status || "pending").toLowerCase(),
    };
  }, [upcoming]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Lernitt</h1>
        {/* Keep search visible even during loading */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            nav(`/tutors?q=${encodeURIComponent(q)}`);
          }}
          className="flex items-center gap-2"
        >
          <input
            placeholder="Search tutors (e.g., English)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm w-72"
          />
          <button type="submit" className="border rounded-2xl px-3 py-2 text-sm">
            Search
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">

      {/* ✅ NEW welcome section */}
      <div style={{ paddingBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          Welcome to Lernitt
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8 }}>
          Book live lessons with tutors worldwide. Choose a subject, pick a tutor, and learn in real time.
        </p>
      </div>

      {/* ✅ Existing content below (unchanged) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          nav(`/tutors?q=${encodeURIComponent(q)}`);
        }}
        className="flex items-center gap-2"
      >
        <input
          placeholder="Search tutors (e.g., English)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded-2xl px-3 py-2 text-sm w-72"
        />
        <button type="submit" className="border rounded-2xl px-3 py-2 text-sm">
          Search
        </button>
      </form>

      {/* --- The rest of the page stays exactly the same --- */}
      {/* Status + calls to action */}
      {err && <div className="text-red-600 text-sm">{err}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        {/* Card: Get started */}
        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Get started</div>
          <p className="text-sm opacity-80">
            Browse tutors, book a trial, and manage your lessons.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/tutors">
              Find tutors
            </Link>
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/favourites">
              Favourites {favCount ? `(${favCount})` : ""}
            </Link>
            {isAuthed ? (
              <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/my-lessons">
                My Lessons
              </Link>
            ) : (
              <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/login">
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Card: Notifications */}
        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Notifications</div>
          <p className="text-sm opacity-80">
            Stay on top of booking updates and messages.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/notifications">
              Open inbox
            </Link>
            <span className="text-xs opacity-70">
              {isAuthed ? `Unread: ${notifUnread}` : "Login to see your inbox"}
            </span>
          </div>
          {MOCK && (
            <div className="text-xs opacity-60 mt-2">
              Mock mode: notifications are simulated.
            </div>
          )}
        </div>

        {/* Card: Upcoming lesson */}
        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Upcoming lesson</div>
          {!isAuthed && <p className="text-sm opacity-80">Log in to see your schedule.</p>}
          {isAuthed && !nextLesson && (
            <p className="text-sm opacity-80">No upcoming lessons yet.</p>
          )}
          {isAuthed && nextLesson && (
            <>
              <div className="text-sm">
                <div>
                  <b>{nextLesson.tutorName}</b>{" "}
                  <span className="opacity-70">({nextLesson.when})</span>
                </div>
                <div className="opacity-80">
                  {nextLesson.isTrial ? "Trial" : "Paid"} · {nextLesson.duration} min
                  {!nextLesson.isTrial && nextLesson.price ? (
                    <> · € {euros(nextLesson.price)}</>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm"
                  to={`/student-lesson/${encodeURIComponent(nextLesson.id)}`}
                >
                  View details
                </Link>
                <Link
                  className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm"
                  to={`/tutors/${encodeURIComponent(nextLesson.tutorId)}`}
                >
                  Tutor
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tutor peek */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold">Popular tutors</div>
          <Link to="/tutors" className="text-sm underline">
            See all
          </Link>
        </div>
        {tutorPeek.length === 0 ? (
          <div className="text-sm opacity-70">No tutors to show yet.</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tutorPeek.map((t) => {
              const id = t._id || t.id;
              const price =
                typeof t.price === "number" ? (t.price >= 1000 ? t.price / 100 : t.price) : null;
              return (
                <li key={id} className="border rounded-2xl p-3 hover:shadow-sm transition">
                  <Link to={`/tutors/${encodeURIComponent(id)}`} className="block">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-semibold">
                        {t.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{t.name || "Tutor"}</div>
                        <div className="text-xs opacity-80 truncate">
                          {(t.subjects || []).slice(0, 3).join(" · ") || "—"}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {Number.isFinite(price) ? `€ ${price.toFixed(2)}/h` : ""}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick admin / tutor utilities */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Tutor tools</div>
          <div className="flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/availability">
              Availability
            </Link>
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/tutor-lessons">
              Tutor lessons
            </Link>
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/payouts">
              Payouts
            </Link>
          </div>
          {MOCK && <div className="text-xs opacity-60 mt-2">Mock mode: data is simulated.</div>}
        </div>

        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Students</div>
          <p className="text-sm opacity-80">Manage your student list and bookings.</p>
          <Link className="mt-2 inline-block border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/students">
            Open Students
          </Link>
        </div>

        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Account</div>
          <div className="flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/profile">
              Profile
            </Link>
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/notifications">
              Notifications {notifUnread ? `(${notifUnread})` : ""}
            </Link>
            <Link className="border px-3 py-1 rounded-2xl text-sm hover:shadow-sm" to="/settings">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
