// client/src/pages/Home.jsx
// -----------------------------------------------------------------------------
// Full marketing homepage with gradient hero (no external image)
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

  // Static subject categories for quick search (search bar chips)
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
        // notifications
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

        // upcoming lessons
        if (isAuthed) {
          const lessons = await apiFetch("/api/lessons/mine", { auth: true });
          if (alive) {
            const rows = (Array.isArray(lessons) ? lessons : []).filter(
              Boolean
            );
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

        // tutors
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
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12 space-y-10">
      {/* ----------------------------------------------------- */}
      {/* HERO SECTION — GRADIENT CARD */}
      {/* ----------------------------------------------------- */}
      <section className="mt-6">
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-10 sm:px-10 sm:py-12 shadow-lg">
          {/* subtle overlay */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          <div className="relative max-w-xl space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              Book live 1-to-1 lessons with expert tutors
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-lg">
              Learn languages, skills, and more — with friendly tutors who teach
              you live.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/signup"
                className="px-5 py-3 rounded-2xl text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 hover:shadow-md transition text-center sm:w-auto"
              >
                I’m a student — Get started
              </Link>

              <Link
                to="/signup?type=tutor"
                className="px-5 py-3 rounded-2xl text-sm font-semibold border border-white/80 text-white hover:bg-white hover:text-slate-900 hover:shadow-md transition text-center sm:w-auto"
              >
                I’m a tutor — Apply to teach
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- */}
      {/* STICKY SEARCH + SUBJECT CATEGORIES */}
      {/* ----------------------------------------------------- */}
      <section className="sticky top-2 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3 shadow-sm">
        {/* Search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            nav(`/tutors?q=${encodeURIComponent(q)}`);
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <input
            placeholder="Search tutors (e.g., English)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border border-slate-300 rounded-2xl px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />
          <button
            type="submit"
            className="border border-slate-300 rounded-2xl px-3 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition w-full sm:w-auto"
          >
            Search
          </button>
        </form>

        {/* Subject categories (chips) */}
        <div className="flex flex-wrap gap-2">
          {categories.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => nav(`/tutors?q=${encodeURIComponent(label)}`)}
              className="px-3 py-1 rounded-2xl text-xs sm:text-sm border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition"
            >
              {label}
            </button>
          ))}
        </div>

        {err && (
          <div className="text-red-600 text-xs sm:text-sm pt-1">{err}</div>
        )}
      </section>

      {/* ----------------------------------------------------- */}
      {/* TOP CARDS: GET STARTED / NOTIFICATIONS / UPCOMING */}
      {/* ----------------------------------------------------- */}
      <section className="grid gap-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1">
        {/* Get started */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1 text-slate-900">Get started</div>
          <p className="text-sm text-slate-600">
            Browse tutors, book lessons, manage availability.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm hover:bg-slate-50"
              to="/tutors"
            >
              Find tutors
            </Link>
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm hover:bg-slate-50"
              to="/favourites"
            >
              Favourites {favCount ? `(${favCount})` : ""}
            </Link>
            {isAuthed ? (
              <Link
                className="border border-slate-300 px-3 py-1 rounded-2xl text-sm hover:bg-slate-50"
                to="/my-lessons"
              >
                My Lessons
              </Link>
            ) : (
              <Link
                className="border border-slate-300 px-3 py-1 rounded-2xl text-sm hover:bg-slate-50"
                to="/login"
              >
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1 text-slate-900">
            Notifications
          </div>
          <p className="text-sm text-slate-600">Your inbox.</p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm hover:bg-slate-50"
              to="/notifications"
            >
              Open inbox
            </Link>
            <span className="text-xs text-slate-500">
              {isAuthed ? `Unread: ${notifUnread}` : "Login to see inbox"}
            </span>
          </div>
        </div>

        {/* Upcoming lesson */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1 text-slate-900">
            Upcoming lesson
          </div>

          {!isAuthed && (
            <p className="text-sm text-slate-600">
              Log in to see your schedule.
            </p>
          )}

          {isAuthed && !nextLesson && (
            <p className="text-sm text-slate-600">No upcoming lessons.</p>
          )}

          {isAuthed && nextLesson && (
            <>
              <div className="text-sm text-slate-800">
                <b>{nextLesson.tutorName}</b>{" "}
                <span className="text-slate-500">({nextLesson.when})</span>
                <div className="text-slate-700">
                  {nextLesson.isTrial ? "Trial" : "Paid"} ·{" "}
                  {nextLesson.duration} min
                  {!nextLesson.isTrial && nextLesson.price ? (
                    <>
                      {" "}
                      · € {euros(nextLesson.price)}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="border border-slate-300 px-3 py-1 rounded-2xl text-sm hover:bg-slate-50"
                  to={`/student-lesson/${nextLesson.id}`}
                >
                  View details
                </Link>
                <Link
                  className="border border-slate-300 px-3 py-1 rounded-2xl text-sm hover:bg-slate-50"
                  to={`/tutors/${nextLesson.tutorId}`}
                >
                  Tutor
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------- */}
      {/* POPULAR TUTORS LIST */}
      {/* ----------------------------------------------------- */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Popular tutors
          </div>
          <Link to="/tutors" className="text-sm underline text-slate-600">
            See all
          </Link>
        </div>

        {tutorPeek.length === 0 ? (
          <div className="text-sm text-slate-500">No tutors yet.</div>
        ) : (
          <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="border border-slate-200 rounded-2xl p-3 hover:shadow-md transition bg-white flex flex-col h-full"
                >
                  <Link
                    to={`/tutors/${encodeURIComponent(id)}`}
                    className="flex-1 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-sm font-semibold bg-slate-50">
                        {t.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-slate-900">
                          {t.name || "Tutor"}
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          {subjects.slice(0, 3).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700">
                      {Number.isFinite(price) ? (
                        <>
                          From € {price.toFixed(2)}/h
                        </>
                      ) : (
                        ""
                      )}
                    </div>

                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subjects.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2">
                      <span className="inline-block text-xs text-slate-500">
                        View profile →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* SECTION DIVIDER */}
      <div className="border-t border-slate-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* POPULAR SUBJECTS STRIP */}
      {/* ----------------------------------------------------- */}
      <section className="space-y-4">
        <div className="text-lg font-semibold text-slate-900">
          Popular subjects
        </div>

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
              type="button"
              onClick={() => nav(`/tutors?q=${encodeURIComponent(name)}`)}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 hover:shadow-md transition text-sm flex items-center gap-2 text-slate-800"
            >
              <span className="text-lg">{icon}</span>
              {name}
            </button>
          ))}
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="border-t border-slate-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* TOP TUTORS MARKETING GRID */}
      {/* ----------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Top tutors
          </div>
          <Link to="/tutors" className="text-sm underline text-slate-600">
            See all
          </Link>
        </div>

        {tutorPeek.length === 0 ? (
          <div className="text-sm text-slate-500">No tutors yet.</div>
        ) : (
          <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tutorPeek.map((t) => {
              const id = t._id || t.id;
              const subjects = Array.isArray(t.subjects) ? t.subjects : [];

              return (
                <li
                  key={id}
                  className="rounded-2xl p-4 bg-gradient-to-br from-white to-purple-50 border border-slate-200 hover:shadow-lg transition flex flex-col gap-3"
                >
                  <Link
                    to={`/tutors/${encodeURIComponent(id)}`}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-slate-300 flex items-center justify-center text-base font-semibold bg-white shadow-sm">
                        {t.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-slate-900">
                          {t.name || "Tutor"}
                        </div>
                        <div className="text-xs text-slate-700 truncate">
                          {subjects.slice(0, 2).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>

                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subjects.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2 py-1 rounded-full border border-slate-300 bg-white text-slate-800"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-slate-600">View profile →</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* SECTION DIVIDER */}
      <div className="border-t border-slate-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* HOW LERNITT WORKS */}
      {/* ----------------------------------------------------- */}
      <section className="space-y-4">
        <div className="text-lg font-semibold text-slate-900">
          How Lernitt works
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-blue-50 border border-slate-200 flex flex-col gap-3">
            <div className="text-3xl">🔎</div>
            <div className="font-semibold text-slate-900">1. Find your tutor</div>
            <p className="text-sm text-slate-700">
              Search friendly tutors for languages, skills and more. Check
              reviews, prices and availability.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-green-50 border border-slate-200 flex flex-col gap-3">
            <div className="text-3xl">📅</div>
            <div className="font-semibold text-slate-900">
              2. Book your lesson
            </div>
            <p className="text-sm text-slate-700">
              Choose a time that suits you. Pay securely in seconds.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-yellow-50 border border-slate-200 flex flex-col gap-3">
            <div className="text-3xl">🎥</div>
            <div className="font-semibold text-slate-900">3. Learn live</div>
            <p className="text-sm text-slate-700">
              Meet your tutor online and enjoy a fun, interactive 1-to-1 lesson.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="border-t border-slate-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* BOTTOM CARDS: TUTOR TOOLS / STUDENTS / ACCOUNT */}
      {/* ----------------------------------------------------- */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1 text-slate-900">Tutor tools</div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm bg-white hover:bg-slate-50 transition"
              to="/availability"
            >
              Availability
            </Link>
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm bg-white hover:bg-slate-50 transition"
              to="/tutor-lessons"
            >
              Tutor lessons
            </Link>
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm bg-white hover:bg-slate-50 transition"
              to="/payouts"
            >
              Payouts
            </Link>
          </div>
          {MOCK && (
            <div className="text-xs text-slate-500 mt-2">
              Mock mode: simulated data.
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1 text-slate-900">Students</div>
          <p className="text-sm text-slate-600">Student list & bookings.</p>
          <Link
            className="mt-2 inline-block border border-slate-300 px-3 py-1 rounded-2xl text-sm bg-white hover:bg-slate-50 transition"
            to="/students"
          >
            Open Students
          </Link>
        </div>

        <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1 text-slate-900">Account</div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm bg-white hover:bg-slate-50 transition"
              to="/profile"
            >
              Profile
            </Link>
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm bg-white hover:bg-slate-50 transition"
              to="/notifications"
            >
              Notifications {notifUnread ? `(${notifUnread})` : ""}
            </Link>
            <Link
              className="border border-slate-300 px-3 py-1 rounded-2xl text-sm bg-white hover:bg-slate-50 transition"
              to="/settings"
            >
              Settings
            </Link>
          </div>
        </div>
      </section>

      {/* EXTRA BOTTOM PADDING FOR MOBILE */}
      <div className="pb-10" />
    </div>
  );
}
