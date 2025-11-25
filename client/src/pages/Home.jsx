// client/src/pages/Home.jsx
// -----------------------------------------------------------------------------
// Full marketing homepage with gradient hero (no image)
// All original features preserved
// Clean Tailwind layout, modern colours, correct spacing
// Fully live + VITE_MOCK compatible
// -----------------------------------------------------------------------------

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

  const categories = ["English", "Spanish", "Maths", "Piano"];

  // Load favourites
  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("favTutors") || "[]");
      setFavCount(Array.isArray(ids) ? ids.length : 0);
    } catch {
      setFavCount(0);
    }
  }, []);

  // Load home data
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        // Notifications
        if (isAuthed) {
          const ns = await apiFetch("/api/notifications", { auth: true });
          if (alive) {
            const unread = Array.isArray(ns)
              ? ns.filter((n) => !n.read).length
              : 0;
            setNotifUnread(unread);
          }
        } else {
          setNotifUnread(0);
        }

        // Upcoming lesson
        if (isAuthed) {
          const lessons = await apiFetch("/api/lessons/mine", { auth: true });
          if (alive) {
            const rows = (Array.isArray(lessons) ? lessons : []).filter(Boolean);
            rows.sort(
              (a, b) =>
                new Date(a.start || a.startTime || 0) -
                new Date(b.start || b.startTime || 0)
            );

            setUpcoming(
              rows.find(
                (l) => new Date(l.start || l.startTime || 0) > new Date()
              ) || null
            );
          }
        } else {
          setUpcoming(null);
        }

        // Tutors
        try {
          const res = await apiFetch("/api/tutors?page=1&limit=6");
          const list = Array.isArray(res)
            ? res
            : res?.data && Array.isArray(res.data)
            ? res.data
            : [];
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

  // Upcoming lesson summary
  const nextLesson = useMemo(() => {
    if (!upcoming) return null;

    const startISO = upcoming.start || upcoming.startTime || upcoming.begin;
    const start = startISO ? new Date(startISO) : null;

    return {
      id: upcoming._id || upcoming.id,
      tutorName: upcoming.tutorName || upcoming.tutor?.name || "Tutor",
      tutorId: String(
        upcoming.tutorId || upcoming.tutor?._id || upcoming.tutor || ""
      ),
      when: start
        ? start.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—",
      duration:
        Number(
          upcoming.duration ||
            (upcoming.endTime
              ? (new Date(upcoming.endTime) - new Date(startISO)) / 60000
              : 0)
        ) || 0,
      isTrial: !!upcoming.isTrial,
      price:
        typeof upcoming.price === "number"
          ? upcoming.price
          : Number(upcoming.price) || 0,
    };
  }, [upcoming]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Loading…</h1>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-14">
      {/* ========================================================================= */}
      {/* HERO SECTION (GRADIENT) */}
      {/* ========================================================================= */}
      <div className="relative w-full rounded-3xl overflow-hidden min-h-[280px] max-h-[420px] h-[55vh] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center">
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative px-6 sm:px-10 text-white max-w-xl space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Book live 1-to-1 lessons with expert tutors
          </h1>

          <p className="text-sm sm:text-base opacity-90">
            Learn languages, skills, and more — with friendly tutors who teach you live.
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="px-5 py-3 rounded-2xl text-sm font-semibold bg-white text-black shadow hover:shadow-md transition"
            >
              I’m a student — Get started
            </Link>

            <Link
              to="/signup?type=tutor"
              className="px-5 py-3 rounded-2xl text-sm font-semibold border border-white text-white hover:bg-white hover:text-black transition"
            >
              I’m a tutor — Apply to teach
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH + CATEGORY CHIPS */}
      {/* ========================================================================= */}
      <div className="sticky top-2 z-20 bg-white/95 backdrop-blur border border-gray-200 rounded-3xl p-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            nav(`/tutors?q=${encodeURIComponent(q)}`);
          }}
          className="flex flex-col sm:flex-row items-center gap-2"
        >
          <input
            placeholder="Search tutors (e.g., English)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm w-full sm:w-72"
          />

          <button
            type="submit"
            className="border rounded-2xl px-3 py-2 text-sm"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {categories.map((label) => (
            <button
              key={label}
              onClick={() => nav(`/tutors?q=${encodeURIComponent(label)}`)}
              className="px-3 py-1 rounded-2xl text-xs sm:text-sm border border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm transition"
            >
              {label}
            </button>
          ))}
        </div>

        {err && <div className="text-red-600 text-xs">{err}</div>}
      </div>

      {/* ========================================================================= */}
      {/* TOP CARDS (Get started, Notifications, Upcoming) */}
      {/* ========================================================================= */}
      <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1">
        {/* GET STARTED */}
        <div className="border rounded-2xl p-4 bg-white">
          <div className="font-semibold mb-1">Get started</div>
          <p className="text-sm opacity-70">
            Browse tutors, book lessons, manage availability.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/tutors">
              Find tutors
            </Link>

            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/favourites">
              Favourites {favCount ? `(${favCount})` : ""}
            </Link>

            {isAuthed ? (
              <Link className="border px-3 py-1 rounded-2xl text-sm" to="/my-lessons">
                My Lessons
              </Link>
            ) : (
              <Link className="border px-3 py-1 rounded-2xl text-sm" to="/login">
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="border rounded-2xl p-4 bg-white">
          <div className="font-semibold mb-1">Notifications</div>
          <p className="text-sm opacity-70">Your inbox.</p>

          <div className="mt-3 flex items-center gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/notifications">
              Open inbox
            </Link>
            <span className="text-xs opacity-60">
              {isAuthed ? `Unread: ${notifUnread}` : "Login to see inbox"}
            </span>
          </div>
        </div>

        {/* UPCOMING LESSON */}
        <div className="border rounded-2xl p-4 bg-white">
          <div className="font-semibold mb-1">Upcoming lesson</div>

          {!isAuthed && (
            <p className="text-sm opacity-70">Log in to see your schedule.</p>
          )}

          {isAuthed && !nextLesson && (
            <p className="text-sm opacity-70">No upcoming lessons.</p>
          )}

          {isAuthed && nextLesson && (
            <div className="text-sm">
              <b>{nextLesson.tutorName}</b>{" "}
              <span className="opacity-70">({nextLesson.when})</span>

              <div className="opacity-70">
                {nextLesson.isTrial ? "Trial" : "Paid"} · {nextLesson.duration} min
                {!nextLesson.isTrial && nextLesson.price ? (
                  <> · € {euros(nextLesson.price)}</>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="border px-3 py-1 rounded-2xl text-sm"
                  to={`/student-lesson/${nextLesson.id}`}
                >
                  View details
                </Link>

                <Link
                  className="border px-3 py-1 rounded-2xl text-sm"
                  to={`/tutors/${nextLesson.tutorId}`}
                >
                  Tutor
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPULAR TUTORS */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold">Popular tutors</div>
          <Link to="/tutors" className="text-sm underline">
            See all
          </Link>
        </div>

        {tutorPeek.length === 0 ? (
          <div className="text-sm opacity-60">No tutors yet.</div>
        ) : (
          <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tutorPeek.map((t) => {
              const id = t._id || t.id;
              const price =
                typeof t.price === "number"
                  ? t.price >= 1000
                    ? t.price / 100
                    : t.price
                  : null;
              const subjects = Array.isArray(t.subjects) ? t.subjects : [];

              return (
                <li
                  key={id}
                  className="border rounded-2xl p-4 bg-white hover:shadow-md transition flex flex-col"
                >
                  <Link to={`/tutors/${encodeURIComponent(id)}`} className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full border flex items-center justify-center font-semibold text-sm">
                        {t.name?.[0] || "?"}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.name}</div>
                        <div className="text-xs opacity-70 truncate">
                          {subjects.slice(0, 3).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs opacity-70 mt-1">
                      {Number.isFinite(price)
                        ? `From € ${price.toFixed(2)}/h`
                        : ""}
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      View profile →
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* ========================================================================= */}
      {/* POPULAR SUBJECTS (SOFT COLOURS) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="text-lg font-semibold">Popular subjects</div>

        <div className="flex flex-wrap gap-3">
          {[
            { name: "English", icon: "🇬🇧" },
            { name: "Spanish", icon: "🇪🇸" },
            { name: "Maths", icon: "🧮" },
            { name: "Piano", icon: "🎹" },
            { name: "French", icon: "🇫🇷" },
            { name: "German", icon: "🇩🇪" },
            { name: "Japanese", icon: "🇯🇵" },
            { name: "Business English", icon: "💼" },
          ].map(({ name, icon }) => (
            <button
              key={name}
              onClick={() => nav(`/tutors?q=${encodeURIComponent(name)}`)}
              className="px-4 py-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 hover:shadow-md transition text-sm flex items-center gap-2"
            >
              <span className="text-lg">{icon}</span>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* ========================================================================= */}
      {/* TOP TUTORS (Marketing grid) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold">Top tutors</div>
          <Link to="/tutors" className="text-sm underline">
            See all
          </Link>
        </div>

        {tutorPeek.length === 0 ? (
          <div className="text-sm opacity-60">No tutors yet.</div>
        ) : (
          <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tutorPeek.map((t) => {
              const id = t._id || t.id;
              const subjects = Array.isArray(t.subjects) ? t.subjects : [];

              return (
                <li
                  key={id}
                  className="rounded-2xl p-4 bg-gradient-to-br from-white to-purple-50 border border-gray-200 hover:shadow-lg transition"
                >
                  <Link to={`/tutors/${encodeURIComponent(id)}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border flex items-center justify-center text-base font-semibold bg-white shadow-sm">
                        {t.name?.[0] || "?"}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.name}</div>
                        <div className="text-xs opacity-70 truncate">
                          {subjects.slice(0, 2).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>

                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {subjects.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2 py-1 rounded-full border border-gray-300 bg-white"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* ========================================================================= */}
      {/* HOW LERNITT WORKS (3 STEPS) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="text-lg font-semibold">How Lernitt works</div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-blue-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">🔎</div>
            <div className="font-semibold">1. Find your tutor</div>
            <p className="text-sm opacity-70">
              Search friendly tutors for languages, skills and more. Check reviews,
              prices and availability.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-green-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">📅</div>
            <div className="font-semibold">2. Book your lesson</div>
            <p className="text-sm opacity-70">
              Choose a time that suits you. Pay securely in seconds.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-yellow-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">🎥</div>
            <div className="font-semibold">3. Learn live</div>
            <p className="text-sm opacity-70">
              Meet your tutor online and enjoy a fun, interactive 1-to-1 lesson.
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* ========================================================================= */}
      {/* BOTTOM CARDS */}
      {/* ========================================================================= */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {/* TUTOR TOOLS */}
        <div className="border rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Tutor tools</div>

          <div className="flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/availability">
              Availability
            </Link>

            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/tutor-lessons">
              Tutor lessons
            </Link>

            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/payouts">
              Payouts
            </Link>
          </div>

          {MOCK && (
            <div className="text-xs opacity-60 mt-2">Mock mode: simulated data.</div>
          )}
        </div>

        {/* STUDENTS */}
        <div className="border rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Students</div>
          <p className="text-sm opacity-70">Student list & bookings.</p>

          <Link className="mt-2 inline-block border px-3 py-1 rounded-2xl text-sm" to="/students">
            Open Students
          </Link>
        </div>

        {/* ACCOUNT */}
        <div className="border rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Account</div>

          <div className="flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/profile">
              Profile
            </Link>

            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/notifications">
              Notifications {notifUnread ? `(${notifUnread})` : ""}
            </Link>

            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/settings">
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="pb-10" />
    </div>
  );
}
