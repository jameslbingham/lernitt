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
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Lernitt</h1>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ----------------------------------------------------- */}
      {/* HERO SECTION (UNCHANGED) */}
      {/* ----------------------------------------------------- */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "55vh",
          minHeight: 260,
          maxHeight: 420,
          borderRadius: 20,
          overflow: "hidden",
          backgroundImage:
            "url('/mnt/data/A_homepage_for_Lernitt,_an_online_live_lesson_plat.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
          }}
        />

        {/* Text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "20px",
            color: "white",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 36px)",
              fontWeight: 800,
              maxWidth: 550,
              lineHeight: 1.2,
            }}
          >
            Book live 1-to-1 lessons with expert tutors
          </h1>

          <p
            style={{
              marginTop: 10,
              fontSize: "clamp(14px, 2.6vw, 18px)",
              opacity: 0.9,
              maxWidth: 500,
            }}
          >
            Learn languages, skills, and more — with friendly tutors who teach
            you live.
          </p>

          <div
            className="mt-4 flex flex-wrap gap-3"
            style={{ maxWidth: 340 }}
          >
            <Link
              to="/signup"
              className="px-5 py-3 rounded-2xl text-sm font-semibold border border-white bg-white text-black hover:shadow-md transition w-full sm:w-auto text-center"
            >
              I’m a student — Get started
            </Link>

            <Link
              to="/signup?type=tutor"
              className="px-5 py-3 rounded-2xl text-sm font-semibold border border-white text-white hover:bg-white hover:text-black transition w-full sm:w-auto text-center"
            >
              I’m a tutor — Apply to teach
            </Link>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* STICKY SEARCH + SUBJECT CATEGORIES (ORIGINAL) */}
      {/* ----------------------------------------------------- */}
      <div className="sticky top-2 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-3 space-y-3">
        {/* Search bar */}
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
            className="border rounded-2xl px-3 py-2 text-sm w-full sm:w-auto"
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
              onClick={() =>
                nav(`/tutors?q=${encodeURIComponent(label)}`)
              }
              className="px-3 py-1 rounded-2xl text-xs sm:text-sm border border-gray-200 hover:border-gray-400 hover:shadow-sm transition bg-white"
            >
              {label}
            </button>
          ))}
        </div>

        {err && <div className="text-red-600 text-xs sm:text-sm">{err}</div>}
      </div>

      {/* ----------------------------------------------------- */}
      {/* TOP CARDS (ORIGINAL) */}
      {/* ----------------------------------------------------- */}
      <div className="grid gap-3 md:grid-cols-3 sm:grid-cols-2 grid-cols-1">
        {/* Get started */}
        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Get started</div>
          <p className="text-sm opacity-80">
            Browse tutors, book lessons, manage availability.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="border px-3 py-1 rounded-2xl text-sm" to="/tutors">
              Find tutors
            </Link>
            <Link
              className="border px-3 py-1 rounded-2xl text-sm"
              to="/favourites"
            >
              Favourites {favCount ? `(${favCount})` : ""}
            </Link>
            {isAuthed ? (
              <Link
                className="border px-3 py-1 rounded-2xl text-sm"
                to="/my-lessons"
              >
                My Lessons
              </Link>
            ) : (
              <Link className="border px-3 py-1 rounded-2xl text-sm" to="/login">
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="border rounded-2xl p-4">
          <div className="font-semibold mb-1">Notifications</div>
          <p className="text-sm opacity-80">Your inbox.</p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              className="border px-3 py-1 rounded-2xl text-sm"
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
        <div className="border rounded-2xl p-4">
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
                  {nextLesson.isTrial ? "Trial" : "Paid"} ·{" "}
                  {nextLesson.duration} min
                  {!nextLesson.isTrial && nextLesson.price ? (
                    <> · € {euros(nextLesson.price)}</>
                  ) : null}
                </div>
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
            </>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* POPULAR TUTORS (ORIGINAL LIST) */}
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
                  className="border rounded-2xl p-3 hover:shadow-md transition bg-white flex flex-col h-full"
                >
                  <Link
                    to={`/tutors/${encodeURIComponent(id)}`}
                    className="flex-1 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-semibold">
                        {t.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {t.name || "Tutor"}
                        </div>
                        <div className="text-xs opacity-80 truncate">
                          {subjects.slice(0, 3).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs opacity-80">
                      {Number.isFinite(price)
                        ? `From € ${price.toFixed(2)}/h`
                        : ""}
                    </div>

                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subjects.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2">
                      <span className="inline-block text-xs text-gray-500">
                        View profile →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ----------------------------------------------------- */}
      {/* SECTION DIVIDER */}
      {/* ----------------------------------------------------- */}
      <div className="border-t border-gray-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* ⭐ NEW SECTION: POPULAR SUBJECTS STRIP (SOFT ACCENTS) */}
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
              className="px-4 py-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 hover:shadow-md transition text-sm flex items-center gap-2"
            >
              <span className="text-lg">{icon}</span>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* SECTION DIVIDER */}
      {/* ----------------------------------------------------- */}
      <div className="border-t border-gray-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* ⭐ NEW SECTION: TOP TUTORS (MARKETING GRID) */}
      {/* ----------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold">Top tutors</div>
          <Link to="/tutors" className="text-sm underline">
            See all
          </Link>
        </div>

        {tutorPeek.length === 0 ? (
          <div className="text-sm opacity-70">No tutors yet.</div>
        ) : (
          <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tutorPeek.map((t) => {
              const id = t._id || t.id;
              const subjects = Array.isArray(t.subjects) ? t.subjects : [];

              return (
                <li
                  key={id}
                  className="rounded-2xl p-4 bg-gradient-to-br from-white to-purple-50 border border-gray-200 hover:shadow-lg transition flex flex-col gap-3"
                >
                  <Link
                    to={`/tutors/${encodeURIComponent(id)}`}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border flex items-center justify-center text-base font-semibold bg-white shadow-sm">
                        {t.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {t.name || "Tutor"}
                        </div>
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
                            className="text-[11px] px-2 py-1 rounded-full border border-gray-300 bg-white"
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
      {/* SECTION DIVIDER */}
      {/* ----------------------------------------------------- */}
      <div className="border-t border-gray-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* ⭐ NEW SECTION: HOW LERNITT WORKS (3 STEPS, ICONS) */}
      {/* ----------------------------------------------------- */}
      <div className="space-y-4">
        <div className="text-lg font-semibold">How Lernitt works</div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-blue-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">🔎</div>
            <div className="font-semibold">1. Find your tutor</div>
            <p className="text-sm opacity-80">
              Search friendly tutors for languages, skills and more. Check
              reviews, prices and availability.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-green-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">📅</div>
            <div className="font-semibold">2. Book your lesson</div>
            <p className="text-sm opacity-80">
              Choose a time that suits you. Pay securely in seconds.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white to-yellow-50 border border-gray-200 flex flex-col gap-3">
            <div className="text-3xl">🎥</div>
            <div className="font-semibold">3. Learn live</div>
            <p className="text-sm opacity-80">
              Meet your tutor online and enjoy a fun, interactive 1-to-1 lesson.
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* SECTION DIVIDER */}
      {/* ----------------------------------------------------- */}
      <div className="border-t border-gray-200 my-6" />

      {/* ----------------------------------------------------- */}
      {/* BOTTOM CARDS (ORIGINAL, WITH LIGHT POLISH) */}
      {/* ----------------------------------------------------- */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="border rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Tutor tools</div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="border px-3 py-1 rounded-2xl text-sm bg-white hover:bg-gray-50 transition"
              to="/availability"
            >
              Availability
            </Link>
            <Link
              className="border px-3 py-1 rounded-2xl text-sm bg-white hover:bg-gray-50 transition"
              to="/tutor-lessons"
            >
              Tutor lessons
            </Link>
            <Link
              className="border px-3 py-1 rounded-2xl text-sm bg-white hover:bg-gray-50 transition"
              to="/payouts"
            >
              Payouts
            </Link>
          </div>
          {MOCK && (
            <div className="text-xs opacity-60 mt-2">
              Mock mode: simulated data.
            </div>
          )}
        </div>

        <div className="border rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Students</div>
          <p className="text-sm opacity-80">Student list & bookings.</p>
          <Link
            className="mt-2 inline-block border px-3 py-1 rounded-2xl text-sm bg-white hover:bg-gray-50 transition"
            to="/students"
          >
            Open Students
          </Link>
        </div>

        <div className="border rounded-2xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-1">Account</div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="border px-3 py-1 rounded-2xl text-sm bg-white hover:bg-gray-50 transition"
              to="/profile"
            >
              Profile
            </Link>
            <Link
              className="border px-3 py-1 rounded-2xl text-sm bg-white hover:bg-gray-50 transition"
              to="/notifications"
            >
              Notifications {notifUnread ? `(${notifUnread})` : ""}
            </Link>
            <Link
              className="border px-3 py-1 rounded-2xl text-sm bg-white hover:bg-gray-50 transition"
              to="/settings"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* EXTRA BOTTOM PADDING FOR MOBILE */}
      <div className="pb-10" />
    </div>
  );
}
