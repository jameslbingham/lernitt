// client/src/pages/Home.jsx
// -----------------------------------------------------------------------------
// Option C-1 with theme support
// - Visitors (not authed): Marketing Homepage
// - Logged-in users: Functional homepage (Chat 83)
// - Shared: Light/Dark theme toggle
// -----------------------------------------------------------------------------
// All existing features preserved: search, categories, tutorPeek, upcoming,
// notifications, favourites, mock/live support.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

const MOCK = import.meta.env.VITE_MOCK === "1";

// Small helper for price formatting
function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

// -----------------------------------------------------------------------------
// Small reusable theme toggle
// -----------------------------------------------------------------------------
function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/90 px-4 py-2 text-xs font-medium shadow-sm backdrop-blur hover:shadow-md"
    >
      <span>{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
    </button>
  );
}

export default function Home() {
  const { isAuthed } = useAuth();

  const [theme, setTheme] = useState("light");

  // Load stored theme once
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lernitt-theme");
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist theme
  useEffect(() => {
    try {
      localStorage.setItem("lernitt-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  if (!isAuthed) {
    return (
      <>
        <MarketingHomepage theme={theme} onToggleTheme={toggleTheme} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </>
    );
  }

  return (
    <>
      <LoggedInHomepage theme={theme} onToggleTheme={toggleTheme} />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
    </>
  );
}

// -----------------------------------------------------------------------------
// MARKETING HOMEPAGE (shown only when NOT logged in)
// -----------------------------------------------------------------------------
function MarketingHomepage({ theme }) {
  const baseBg =
    theme === "dark" ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900";
  const cardBg = theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white";
  const subtleBg =
    theme === "dark"
      ? "from-slate-900 to-slate-800 border-slate-700"
      : "from-white to-gray-50 border-gray-200";

  return (
    <div className={`${baseBg} space-y-20 pb-20 pt-6`}>
      {/* HERO SECTION */}
      <section className="mx-auto w-full max-w-6xl px-4">
        <div className="relative h-[60vh] min-h-[320px] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative flex h-full items-center justify-center px-6 text-center text-white">
            <div className="max-w-2xl space-y-5">
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                Learn anything with friendly tutors — live, 1-to-1.
              </h1>
              <p className="mx-auto max-w-xl text-base sm:text-lg opacity-90">
                Languages, skills, and more. Book your first lesson today.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Link
                  to="/signup"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:shadow-lg"
                >
                  I’m a student — Get started
                </Link>
                <Link
                  to="/signup?type=tutor"
                  className="rounded-xl border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                >
                  I’m a tutor — Apply
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY LERNITT */}
      <section className="mx-auto max-w-6xl px-4 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Why Lernitt?</h2>
          <p className="mx-auto max-w-2xl text-sm opacity-80">
            A simple platform that connects learners and tutors worldwide for
            live, 1-to-1 lessons.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🎯",
              title: "Lessons that fit your life",
              text: "Book tutors across timezones with flexible scheduling.",
            },
            {
              icon: "💬",
              title: "Real conversation",
              text: "Learn with real humans in live sessions, not scripts.",
            },
            {
              icon: "🧑‍🏫",
              title: "Hand-picked tutors",
              text: "Teachers with profiles, reviews, and clear pricing.",
            },
            {
              icon: "📚",
              title: "Any subject",
              text: "Languages, business English, maths, piano, and more.",
            },
            {
              icon: "🌍",
              title: "Global access",
              text: "Meet tutors from all over the world, 24/7.",
            },
            {
              icon: "💸",
              title: "Transparent pricing",
              text: "You always see the full cost before you book.",
            },
          ].map(({ icon, title, text }) => (
            <div
              key={title}
              className={`space-y-3 rounded-2xl border p-6 shadow-sm ${cardBg}`}
            >
              <div className="text-3xl">{icon}</div>
              <div className="text-lg font-semibold">{title}</div>
              <p className="text-sm opacity-80">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">How Lernitt works</h2>
          <p className="mx-auto max-w-2xl text-sm opacity-80">
            Getting started takes just a few minutes.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: "🔎",
              title: "1. Find a tutor",
              text: "Search tutors for languages, skills, and more.",
            },
            {
              icon: "📅",
              title: "2. Book a time",
              text: "Choose a slot that fits your schedule.",
            },
            {
              icon: "🎥",
              title: "3. Learn live",
              text: "Meet your tutor online and enjoy your lesson.",
            },
          ].map(({ icon, title, text }) => (
            <div
              key={title}
              className={`space-y-4 rounded-2xl border p-6 bg-gradient-to-br ${subtleBg}`}
            >
              <div className="text-4xl">{icon}</div>
              <div className="text-lg font-semibold">{title}</div>
              <p className="text-sm opacity-80">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-4 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">What learners say</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              name: "Emma",
              text: "My English improved faster than I expected. Lessons are fun and relaxed!",
            },
            {
              name: "Diego",
              text: "Booking was easy. Great tutors and clear pricing.",
            },
            {
              name: "Sofia",
              text: "I practice speaking every week now — I love the flexibility.",
            },
            {
              name: "Liam",
              text: "Amazing tutors. Very helpful and patient.",
            },
          ].map(({ name, text }) => (
            <div
              key={name}
              className={`space-y-3 rounded-2xl border p-6 shadow-sm ${cardBg}`}
            >
              <p className="text-sm italic opacity-90">“{text}”</p>
              <div className="text-xs font-semibold opacity-70">— {name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-3xl px-4 text-center space-y-6">
        <h2 className="text-3xl font-bold">Ready to start learning?</h2>
        <p className="mx-auto max-w-md text-sm opacity-80">
          Find the perfect tutor and book your first lesson in minutes.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            to="/signup"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Get Started
          </Link>
          <Link
            to="/tutors"
            className={`rounded-xl border px-6 py-3 text-sm font-semibold transition ${
              theme === "dark"
                ? "border-slate-600 bg-slate-900 hover:bg-slate-800"
                : "border-gray-300 bg-white hover:shadow-md"
            }`}
          >
            Browse Tutors
          </Link>
        </div>
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// LOGGED-IN HOMEPAGE (full Chat 83 features preserved)
// -----------------------------------------------------------------------------
function LoggedInHomepage({ theme }) {
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
            const rows = (Array.isArray(lessons) ? lessons : []).filter(Boolean);
            rows.sort(
              (a, b) =>
                new Date(a.start || a.startTime || 0) -
                new Date(b.start || b.startTime || 0)
            );
            setUpcoming(
              rows.find(
                (l) =>
                  new Date(l.start || l.startTime || 0) > new Date()
              ) || null
            );
          }
        } else {
          setUpcoming(null);
        }

        // tutors preview
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

  // Loading state
  if (loading) {
    return (
      <div
        className={`p-4 space-y-4 ${
          theme === "dark"
            ? "bg-slate-950 text-slate-50"
            : "bg-white text-slate-900"
        }`}
      >
        <h1 className="text-2xl font-bold">Welcome to Lernitt</h1>
      </div>
    );
  }

  const baseBg =
    theme === "dark" ? "bg-slate-950 text-slate-50" : "bg-white text-slate-900";
  const cardBg =
    theme === "dark"
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-200";
  const subtleBg =
    theme === "dark"
      ? "from-slate-900 to-slate-800 border-slate-700"
      : "from-white to-blue-50 border-gray-200";

  return (
    <div className={`${baseBg} space-y-10 pb-10 pt-6`}>
      {/* HERO SECTION (GRADIENT) */}
      <div className="relative mx-auto w-full max-w-6xl h-[55vh] min-h-[260px] max-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center">
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 px-6 max-w-xl space-y-4 text-white">
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Book live 1-to-1 lessons with expert tutors
          </h1>

          <p className="text-base sm:text-lg opacity-90">
            Learn languages, skills, and more — with friendly tutors who teach you
            live.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 max-w-[340px]">
            <Link
              to="/signup"
              className="w-full sm:w-auto rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-black shadow-sm transition hover:shadow-md"
            >
              I’m a student — Get started
            </Link>

            <Link
              to="/signup?type=tutor"
              className="w-full sm:w-auto rounded-xl border border-white px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white hover:text-black"
            >
              I’m a tutor — Apply to teach
            </Link>
          </div>
        </div>
      </div>

      {/* SEARCH + CATEGORIES */}
      <div className="mx-auto w-full max-w-6xl">
        <div
          className={`sticky top-2 z-10 rounded-2xl border p-3 shadow-sm backdrop-blur ${
            theme === "dark"
              ? "bg-slate-900/95 border-slate-700"
              : "bg-white/95 border-gray-200"
          } space-y-3`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              nav(`/tutors?q=${encodeURIComponent(q)}`);
            }}
            className="flex flex-col items-center gap-2 sm:flex-row"
          >
            <input
              placeholder="Search tutors (e.g., English)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm sm:w-72"
            />
            <button
              type="submit"
              className="w-full rounded-xl border px-3 py-2 text-sm sm:w-auto"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {categories.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => nav(`/tutors?q=${encodeURIComponent(label)}`)}
                className="rounded-xl border px-3 py-1 text-xs sm:text-sm hover:border-gray-400 hover:shadow-sm bg-white"
              >
                {label}
              </button>
            ))}
          </div>

          {err && <div className="text-xs text-red-500">{err}</div>}
        </div>
      </div>

      {/* TOP CARDS — Get Started / Notifications / Upcoming */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {/* Get started */}
        <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
          <div className="mb-1 font-semibold">Get started</div>
          <p className="text-sm opacity-80">
            Browse tutors, book lessons, manage availability.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="rounded-xl border px-3 py-1 text-sm" to="/tutors">
              Find tutors
            </Link>
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/favourites"
            >
              Favourites {favCount ? `(${favCount})` : ""}
            </Link>
            {isAuthed ? (
              <Link
                className="rounded-xl border px-3 py-1 text-sm"
                to="/my-lessons"
              >
                My Lessons
              </Link>
            ) : (
              <Link
                className="rounded-xl border px-3 py-1 text-sm"
                to="/login"
              >
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
          <div className="mb-1 font-semibold">Notifications</div>
          <p className="text-sm opacity-80">Your inbox.</p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/notifications"
            >
              Open inbox
            </Link>
            <span className="text-xs opacity-70">
              {isAuthed ? `Unread: ${notifUnread}` : "Login to see inbox"}
            </span>
          </div>
        </div>

        {/* Upcoming lesson */}
        <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
          <div className="mb-1 font-semibold">Upcoming lesson</div>

          {!isAuthed && (
            <p className="text-sm opacity-80">Log in to see your schedule.</p>
          )}

          {isAuthed && !nextLesson && (
            <p className="text-sm opacity-80">No upcoming lessons.</p>
          )}

          {isAuthed && nextLesson && (
            <>
              <div className="text-sm">
                <b>{nextLesson.tutorName}</b>{" "}
                <span className="opacity-70">({nextLesson.when})</span>
                <div className="opacity-80">
                  {nextLesson.isTrial ? "Trial" : "Paid"} · {nextLesson.duration}{" "}
                  min
                  {!nextLesson.isTrial && nextLesson.price ? (
                    <> · € {euros(nextLesson.price)}</>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="rounded-xl border px-3 py-1 text-sm"
                  to={`/student-lesson/${nextLesson.id}`}
                >
                  View details
                </Link>
                <Link
                  className="rounded-xl border px-3 py-1 text-sm"
                  to={`/tutors/${nextLesson.tutorId}`}
                >
                  Tutor
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* POPULAR TUTORS */}
      <div className="mx-auto w-full max-w-6xl space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold">Popular tutors</div>
          <Link to="/tutors" className="text-sm underline">
            See all
          </Link>
        </div>

        {tutorPeek.length === 0 ? (
          <div className="text-sm opacity-70">No tutors yet.</div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tutorPeek.map((t) => {
              const id = t._id || t.id;
              const subjects = Array.isArray(t.subjects) ? t.subjects : [];

              return (
                <li
                  key={id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm ${cardBg}`}
                >
                  <Link
                    to={`/tutors/${encodeURIComponent(id)}`}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-gray-50 text-base font-semibold">
                        {t.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {t.name || "Tutor"}
                        </div>
                        <div className="truncate text-xs opacity-80">
                          {subjects.slice(0, 2).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>

                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subjects.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-gray-300 bg-gray-50 px-2 py-1 text-[11px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-600">
                      View profile →
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* POPULAR SUBJECTS */}
      <div className="mx-auto w-full max-w-6xl space-y-4">
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
              type="button"
              onClick={() => nav(`/tutors?q=${encodeURIComponent(name)}`)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm shadow-sm hover:shadow-md bg-gradient-to-br ${subtleBg}`}
            >
              <span className="text-lg">{icon}</span>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* HOW LERNITT WORKS (from Chat 83) */}
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="text-lg font-semibold">How Lernitt works</div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            className={`flex flex-col gap-3 rounded-xl border p-5 bg-gradient-to-br ${subtleBg}`}
          >
            <div className="text-3xl">🔎</div>
            <div className="font-semibold">1. Find your tutor</div>
            <p className="text-sm opacity-80">
              Search friendly tutors for languages, skills and more.
            </p>
          </div>

          <div
            className={`flex flex-col gap-3 rounded-xl border p-5 bg-gradient-to-br ${subtleBg}`}
          >
            <div className="text-3xl">📅</div>
            <div className="font-semibold">2. Book your lesson</div>
            <p className="text-sm opacity-80">
              Choose a time that suits you.
            </p>
          </div>

          <div
            className={`flex flex-col gap-3 rounded-xl border p-5 bg-gradient-to-br ${subtleBg}`}
          >
            <div className="text-3xl">🎥</div>
            <div className="font-semibold">3. Learn live</div>
            <p className="text-sm opacity-80">
              Meet your tutor online in a fun, interactive lesson.
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM CARDS */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
          <div className="mb-1 font-semibold">Tutor tools</div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/availability"
            >
              Availability
            </Link>
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/tutor-lessons"
            >
              Tutor lessons
            </Link>
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/payouts"
            >
              Payouts
            </Link>
          </div>
          {MOCK && (
            <div className="mt-2 text-xs opacity-60">
              Mock mode: simulated data.
            </div>
          )}
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
          <div className="mb-1 font-semibold">Students</div>
          <p className="text-sm opacity-80">Student list & bookings.</p>
          <Link
            className="mt-2 inline-block rounded-xl border px-3 py-1 text-sm"
            to="/students"
          >
            Open Students
          </Link>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
          <div className="mb-1 font-semibold">Account</div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/profile"
            >
              Profile
            </Link>
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/notifications"
            >
              Notifications {notifUnread ? `(${notifUnread})` : ""}
            </Link>
            <Link
              className="rounded-xl border px-3 py-1 text-sm"
              to="/settings"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
