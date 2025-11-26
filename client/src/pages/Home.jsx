// client/src/pages/Home.jsx
// -----------------------------------------------------------------------------
// Option C-1: Two internal components
// - Visitors (not authed): Marketing Homepage
// - Logged-in users: Full functional homepage (Chat 83)
// -----------------------------------------------------------------------------
// All existing features preserved: search, categories, tutorPeek, upcoming,
// notifications, favourites, mock/live support.
// -----------------------------------------------------------------------------
// Wireframe-level marketing homepage: hero, Why Lernitt, Features,
// Testimonials, CTA section. Clean Tailwind layout.
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

export default function Home() {
  const { isAuthed } = useAuth();

  // Option C-1 branching
  if (!isAuthed) return <MarketingHomepage />;

  return <LoggedInHomepage />;
}

// -----------------------------------------------------------------------------
// MARKETING HOMEPAGE (shown only when NOT logged in)
// -----------------------------------------------------------------------------
function MarketingHomepage() {
  return (
    <div className="space-y-20 pb-20">
      {/* ----------------------------------------------------- */}
      {/* HERO SECTION */}
      {/* ----------------------------------------------------- */}
      <section className="relative w-full h-[65vh] min-h-[360px] rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-white max-w-2xl px-6 text-center space-y-5">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Learn anything with friendly tutors — live, 1-to-1.
          </h1>
          <p className="text-lg opacity-90 max-w-xl mx-auto">
            Languages, skills, and more. Book your first lesson today.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:shadow-lg transition"
            >
              I’m a student — Get started
            </Link>
            <Link
              to="/signup?type=tutor"
              className="px-6 py-3 rounded-xl border border-white text-white font-semibold hover:bg-white hover:text-black transition"
            >
              I’m a tutor — Apply
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- */}
      {/* WHY LERNITT */}
      {/* ----------------------------------------------------- */}
      <section className="max-w-4xl mx-auto px-6 space-y-10">
        <h2 className="text-3xl font-bold text-center">Why Lernitt?</h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🎯",
              title: "Lessons that fit your life",
              text: "Book tutors across timezones with flexible scheduling.",
            },
            {
              icon: "💬",
              title: "Real conversation practice",
              text: "Improve with friendly tutors who teach live, not through AI scripts.",
            },
            {
              icon: "🧑‍🏫",
              title: "Hand-picked tutors",
              text: "Teachers with verified profiles, reviews, and clear pricing.",
            },
            {
              icon: "📚",
              title: "Any subject",
              text: "Languages, business English, maths, piano, and more.",
            },
            {
              icon: "🌍",
              title: "Global access",
              text: "Connect with tutors worldwide — 24/7 availability.",
            },
            {
              icon: "💸",
              title: "Transparent pricing",
              text: "No hidden fees. You always see the full cost before booking.",
            },
          ].map(({ icon, title, text }) => (
            <div
              key={title}
              className="p-6 rounded-2xl border bg-white shadow-sm space-y-3"
            >
              <div className="text-4xl">{icon}</div>
              <div className="font-semibold text-lg">{title}</div>
              <p className="text-sm opacity-80">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- */}
      {/* HOW IT WORKS */}
      {/* ----------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-6 space-y-10">
        <h2 className="text-3xl font-bold text-center">How Lernitt works</h2>

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
              className="p-6 rounded-2xl bg-gradient-to-br from-white to-gray-50 border shadow-sm space-y-4"
            >
              <div className="text-5xl">{icon}</div>
              <div className="font-semibold text-lg">{title}</div>
              <p className="text-sm opacity-80">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- */}
      {/* TESTIMONIALS */}
      {/* ----------------------------------------------------- */}
      <section className="max-w-4xl mx-auto px-6 space-y-10">
        <h2 className="text-3xl font-bold text-center">What learners say</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              name: "Emma",
              text: "“My English improved faster than I expected. Lessons are fun and relaxed!”",
            },
            {
              name: "Diego",
              text: "“Booking was easy. Great tutors and clear pricing.”",
            },
            {
              name: "Sofia",
              text: "“I practice speaking every week now —love the flexibility!”",
            },
            {
              name: "Liam",
              text: "“Amazing tutors. Very helpful and patient.”",
            },
          ].map(({ name, text }) => (
            <div
              key={name}
              className="p-6 rounded-2xl border bg-white shadow-sm space-y-3"
            >
              <p className="text-sm italic opacity-90"> {text} </p>
              <div className="text-xs font-semibold opacity-70">— {name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- */}
      {/* FINAL CTA */}
      {/* ----------------------------------------------------- */}
      <section className="max-w-3xl mx-auto px-6 text-center space-y-6">
        <h2 className="text-3xl font-bold">Ready to start learning?</h2>
        <p className="text-sm opacity-80 max-w-md mx-auto">
          Find the perfect tutor and book your first lesson in minutes.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            to="/signup"
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Get Started
          </Link>
          <Link
            to="/tutors"
            className="px-6 py-3 rounded-xl border border-gray-300 bg-white hover:shadow-md transition"
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
function LoggedInHomepage() {
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
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Lernitt</h1>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // FULL CHAT 83 UI (all original blocks preserved)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-10 pb-10">
      {/* ----------------------------------------------------- */}
      {/* HERO SECTION (GRADIENT) */}
      {/* ----------------------------------------------------- */}
      <div className="relative w-full h-[55vh] min-h-[260px] max-h-[420px] rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center">
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 text-white px-6 max-w-xl space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Book live 1-to-1 lessons with expert tutors
          </h1>

          <p className="text-base sm:text-lg opacity-90">
            Learn languages, skills, and more — with friendly tutors who teach you live.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 max-w-[340px]">
            <Link
              to="/signup"
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:shadow-md transition w-full sm:w-auto text-center"
            >
              I’m a student — Get started
            </Link>

            <Link
              to="/signup?type=tutor"
              className="px-5 py-3 rounded-xl text-sm font-semibold border border-white text-white hover:bg-white hover:text-black transition w-full sm:w-auto text-center"
            >
              I’m a tutor — Apply to teach
            </Link>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* SEARCH + CATEGORIES */}
      {/* ----------------------------------------------------- */}
      <div className="sticky top-2 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-3 space-y-3 shadow-sm">
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
            className="border rounded-xl px-3 py-2 text-sm w-full sm:w-72"
          />
          <button
            type="submit"
            className="border rounded-xl px-3 py-2 text-sm w-full sm:w-auto"
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
              className="px-3 py-1 rounded-xl text-xs sm:text-sm border border-gray-200 hover:border-gray-400 hover:shadow-sm transition bg-white"
            >
              {label}
            </button>
          ))}
        </div>

        {err && <div className="text-red-600 text-xs">{err}</div>}
      </div>

      {/* ----------------------------------------------------- */}
      {/* TOP CARDS — Get Started / Notifications / Upcoming */}
      {/* ----------------------------------------------------- */}
      <div className="grid gap-3 md:grid-cols-3 sm:grid-cols-2 grid-cols-1">
        {/* Get started */}
        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Get started</div>
          <p className="text-sm opacity-80">
            Browse tutors, book lessons, manage availability.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/tutors">
              Find tutors
            </Link>
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/favourites">
              Favourites {favCount ? `(${favCount})` : ""}
            </Link>
            {isAuthed ? (
              <Link className="border px-3 py-1 rounded-xl text-sm" to="/my-lessons">
                My Lessons
              </Link>
            ) : (
              <Link className="border px-3 py-1 rounded-xl text-sm" to="/login">
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Notifications</div>
          <p className="text-sm opacity-80">Your inbox.</p>
          <div className="mt-3 flex items-center gap-2">
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/notifications">
              Open inbox
            </Link>
            <span className="text-xs opacity-70">
              {isAuthed ? `Unread: ${notifUnread}` : "Login to see inbox"}
            </span>
          </div>
        </div>

        {/* Upcoming lesson */}
        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Upcoming lesson</div>

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
                  {nextLesson.isTrial ? "Trial" : "Paid"} · {nextLesson.duration} min
                  {!nextLesson.isTrial && nextLesson.price ? (
                    <> · € {euros(nextLesson.price)}</>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="border px-3 py-1 rounded-xl text-sm"
                  to={`/student-lesson/${nextLesson.id}`}
                >
                  View details
                </Link>
                <Link
                  className="border px-3 py-1 rounded-xl text-sm"
                  to={`/tutors/${nextLesson.tutorId}`}
                >
                  Tutor
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* POPULAR TUTORS */}
      {/* ----------------------------------------------------- */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold">Popular tutors</div>
          <Link to="/tutors" className="text-sm underline">
            See all
          </Link>
        </div>

        {tutorPeek.length === 0 ? (
          <div className="text-sm opacity-70">No tutors yet.</div>
        ) : (
          <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tutorPeek.map((t) => {
              const id = t._id || t.id;
              const subjects = Array.isArray(t.subjects) ? t.subjects : [];

              return (
                <li
                  key={id}
                  className="rounded-xl p-4 bg-white border border-gray-200 hover:shadow-md transition flex flex-col gap-3"
                >
                  <Link to={`/tutors/${encodeURIComponent(id)}`} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border flex items-center justify-center text-base font-semibold bg-gray-50">
                        {t.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.name || "Tutor"}</div>
                        <div className="text-xs opacity-80 truncate">
                          {subjects.slice(0, 2).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>

                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subjects.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2 py-1 rounded-full border border-gray-300 bg-gray-50"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-600">View profile →</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ----------------------------------------------------- */}
      {/* POPULAR SUBJECTS */}
      {/* ----------------------------------------------------- */}
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
              type="button"
              onClick={() => nav(`/tutors?q=${encodeURIComponent(name)}`)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 hover:shadow-md transition text-sm flex items-center gap-2"
            >
              <span className="text-lg">{icon}</span>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* HOW LERNITT WORKS (from Chat 83) */}
      {/* ----------------------------------------------------- */}
      <div className="space-y-4">
        <div className="text-lg font-semibold">How Lernitt works</div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-xl p-5 bg-gradient-to-br from-white to-blue-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">🔎</div>
            <div className="font-semibold">1. Find your tutor</div>
            <p className="text-sm opacity-80">
              Search friendly tutors for languages, skills and more.
            </p>
          </div>

          <div className="rounded-xl p-5 bg-gradient-to-br from-white to-green-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">📅</div>
            <div className="font-semibold">2. Book your lesson</div>
            <p className="text-sm opacity-80">Choose a time that suits you.</p>
          </div>

          <div className="rounded-xl p-5 bg-gradient-to-br from-white to-yellow-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">🎥</div>
            <div className="font-semibold">3. Learn live</div>
            <p className="text-sm opacity-80">
              Meet your tutor online in a fun, interactive lesson.
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* BOTTOM CARDS */}
      {/* ----------------------------------------------------- */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Tutor tools</div>
          <div className="flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/availability">
              Availability
            </Link>
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/tutor-lessons">
              Tutor lessons
            </Link>
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/payouts">
              Payouts
            </Link>
          </div>
          {MOCK && (
            <div className="text-xs opacity-60 mt-2">Mock mode: simulated data.</div>
          )}
        </div>

        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Students</div>
          <p className="text-sm opacity-80">Student list & bookings.</p>
          <Link className="mt-2 inline-block border px-3 py-1 rounded-xl text-sm" to="/students">
            Open Students
          </Link>
        </div>

        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Account</div>
          <div className="flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/profile">
              Profile
            </Link>
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/notifications">
              Notifications {notifUnread ? `(${notifUnread})` : ""}
            </Link>
            <Link className="border px-3 py-1 rounded-xl text-sm" to="/settings">
              Settings
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
