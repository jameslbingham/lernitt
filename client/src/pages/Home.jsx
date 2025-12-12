// client/src/pages/Home.jsx
// -----------------------------------------------------------------------------
// Option C-1: Two internal homepages + shared UI
// - Visitors (not authed): MarketingHomepage
// - Logged-in users: LoggedInHomepage (Chat 83 logic preserved)
// - Shared: Dark/light theme toggle, FAQ side panel, Ask Us button
// -----------------------------------------------------------------------------
// Added in this sweep:
// - FAQ “Ask Us” drawer (categories → questions → answers)
// - FAQ search bar (always visible) searching questions + answers
// - Highlighting of search term in results
// - Tutor avatars with coloured backgrounds
// - Improved spacing rhythm (pt-20/pb-20, space-y-16)
// - Slight motion: hover lift / transitions
// - Better shadows & gradients for cards and chips
// - "Try a free trial lesson" badge in hero
// - Microcopy under hero CTAs
// - Footer navigation (About | Tutors | Pricing | Contact | Terms | Privacy)
// - All existing behaviours from Chat 83 preserved
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Footer from "../components/Footer.jsx";

const MOCK = import.meta.env.VITE_MOCK === "1";

// Small helper for price formatting
function euros(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return (v >= 1000 ? v / 100 : v).toFixed(2);
}

// -----------------------------------------------------------------------------
// FAQ data
// -----------------------------------------------------------------------------
const FAQ_DATA = {
  "Lessons & Booking": [
    { q: "How do lessons work?", a: "You choose a tutor, pick a time,..." },
    { q: "Can I reschedule a lesson?", a: "Yes. You can request..." },
    { q: "Do you offer trial lessons?", a: "Many tutors offer..." }
  ],
  "Payments & Refunds": [
    { q: "How do payments work?", a: "You pay securely..." },
    { q: "Can I get a refund?", a: "If a lesson is cancelled..." },
    { q: "Which currencies do you support?", a: "Right now, USD..." }
  ],
  "Tutors & Requirements": [
    { q: "Who can teach on Lernitt?", a: "Tutors must complete..." },
    { q: "How are tutors rated?", a: "After each lesson..." }
  ],
  "Account & Technical": [
    { q: "What do I need for a lesson?", a: "Stable internet..." },
    { q: "Do I need extra software?", a: "No. Lessons run..." },
    { q: "I can’t join my lesson.", a: "Refresh, check internet..." }
  ]
};

// -----------------------------------------------------------------------------
// Highlight search matches
// -----------------------------------------------------------------------------
function highlightMatch(text, query) {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let index;

  while ((index = lowerText.indexOf(lowerQuery, lastIndex)) !== -1) {
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    parts.push(
      <mark key={index} className="rounded-sm bg-yellow-200 px-0.5 text-black">
        {text.slice(index, index + query.length)}
      </mark>
    );
    lastIndex = index + query.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// -----------------------------------------------------------------------------
// Theme Toggle
// -----------------------------------------------------------------------------
function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full border bg-white/90 px-4 py-2 text-xs shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span>{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Ask Us button
// -----------------------------------------------------------------------------
function AskUsButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg"
    >
      <span>❓</span>
      <span>Ask us</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// FAQ Drawer
// -----------------------------------------------------------------------------
function FaqDrawer({ open, onClose, theme }) {
  const [activeCategory, setActiveCategory] = useState(
    Object.keys(FAQ_DATA)[0] || ""
  );
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(null);
  const [search, setSearch] = useState("");

  const allFaqItems = useMemo(() => {
    const items = [];
    for (const [category, list] of Object.entries(FAQ_DATA)) {
      list.forEach((it) => items.push({ ...it, category }));
    }
    return items;
  }, []);

  useEffect(() => {
    if (open) {
      setActiveCategory(Object.keys(FAQ_DATA)[0] || "");
      setActiveQuestionIndex(null);
      setSearch("");
    }
  }, [open]);

  const trimmed = search.trim().toLowerCase();
  const inSearchMode = trimmed.length > 0;

  const visibleItems = inSearchMode
    ? allFaqItems.filter((item) => {
        const q = item.q.toLowerCase();
        const a = item.a.toLowerCase();
        return q.includes(trimmed) || a.includes(trimmed);
      })
    : FAQ_DATA[activeCategory] || [];

  const baseBg =
    theme === "dark"
      ? "bg-slate-950 text-slate-50"
      : "bg-white text-slate-900";
  const panelBg =
    theme === "dark"
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-200";

  return (
    <div
      className={`fixed inset-0 z-40 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md transform flex-col border-l ${baseBg} ${
          open ? "translate-x-0" : "translate-x-full"
        } transition-transform`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-4 py-3 ${panelBg}`}
        >
          <div>
            <div className="text-sm font-semibold">Help & FAQ</div>
            <div className="text-xs opacity-70">Find quick answers.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border px-3 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search */}
          <div className="border-b px-4 py-3">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                theme === "dark"
                  ? "border-slate-600 bg-slate-900"
                  : "border-gray-300 bg-white"
              }`}
            >
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search questions…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveQuestionIndex(null);
                }}
                className="flex-1 bg-transparent text-xs outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveQuestionIndex(null);
                  }}
                  className="text-[11px] opacity-70 hover:opacity-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          {!inSearchMode && (
            <div className="flex flex-wrap gap-2 border-b px-4 py-3 text-xs">
              {Object.keys(FAQ_DATA).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    setActiveQuestionIndex(null);
                  }}
                  className={`rounded-full px-3 py-1 ${
                    cat === activeCategory
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-300 bg-white dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Questions */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            {visibleItems.map((item, index) => {
              const openItem = index === activeQuestionIndex;
              return (
                <div
                  key={`${item.q}-${index}`}
                  className={`rounded-xl border p-3 ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuestionIndex(openItem ? null : index)
                    }
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">
                        {inSearchMode ? highlightMatch(item.q, search) : item.q}
                      </span>
                      {item.category && inSearchMode && (
                        <span className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] opacity-80">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 text-xs opacity-70">
                      {openItem ? "−" : "+"}
                    </span>
                  </button>

                  {openItem && (
                    <p className="mt-2 text-xs opacity-80">
                      {inSearchMode ? highlightMatch(item.a, search) : item.a}
                    </p>
                  )}
                </div>
              );
            })}

            {visibleItems.length === 0 && (
              <p className="text-xs opacity-70">
                No questions match your search yet.
              </p>
            )}
          </div>

          <div className="border-t px-4 py-3 text-xs opacity-70">
            Still stuck? Contact support from your account area.
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN HOME — ALWAYS SHOW MARKETING HOMEPAGE NOW
// -----------------------------------------------------------------------------
export default function Home() {
  const [theme, setTheme] = useState("light");
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lernitt-theme");
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem("lernitt-theme", theme);
  }, [theme]);

  return (
    <>
      <MarketingHomepage theme={theme} />
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />
      <AskUsButton onClick={() => setFaqOpen(true)} />
      <FaqDrawer
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        theme={theme}
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// MARKETING HOMEPAGE (NEW HERO + BUTTONS + MATCHES NEW GLOBAL HEADER)
// -----------------------------------------------------------------------------
function MarketingHomepage({ theme }) {
  const baseBg =
    theme === "dark" ? "bg-slate-950 text-slate-50" : "text-slate-900";

  return (
    <div
      className={`${baseBg} min-h-screen`}
      style={theme === "dark" ? undefined : { backgroundColor: "#E9F1F7" }}
    >
      {/* NEW GLOBAL HEADER FROM App.jsx NOW HANDLES THE LOGO + NAV */}

      <main className="mx-auto flex max-w-6xl flex-col space-y-16 px-4 pt-4 pb-20">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative flex flex-col items-center justify-center gap-8 px-6 py-12 text-center text-white sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <span>✨</span>
                <span>Try a free trial lesson</span>
              </div>

              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                Learn anything with friendly tutors — live, 1-to-1.
              </h1>
              <p className="max-w-md text-base opacity-90 sm:text-lg">
                Languages, skills, and more. Book your first lesson in minutes.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  I’m a student — Get started
                </Link>
                <Link
                  to="/signup?type=tutor"
                  className="inline-flex items-center justify-center rounded-xl border border-white px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black"
                >
                  I’m a tutor — Apply
                </Link>
              </div>

              <p className="text-xs opacity-80">
                Only takes a minute. No long forms.
              </p>
            </div>

            {/* Simple placeholder “hero graphic” */}
            <div className="mt-4 w-full max-w-sm sm:mt-0">
              <div className="flex h-52 flex-col justify-between rounded-2xl bg-white/10 p-4 shadow-lg backdrop-blur-sm">
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded-full bg-white/40" />
                  <div className="h-3 w-32 rounded-full bg-white/30" />
                  <div className="h-3 w-20 rounded-full bg-white/20" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded-full bg-white/30" />
                  <div className="h-3 w-28 rounded-full bg-white/20" />
                  <div className="h-3 w-24 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section className="rounded-2xl bg-gradient-to-r from-sky-500/10 via-teal-500/10 to-sky-500/10 border border-sky-500/20 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-sky-500 font-semibold">
              Simple, fair pricing
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold">
              Pay only for lessons. No subscriptions. No lock-in.
            </h2>
            <p className="text-sm md:text-base opacity-80 max-w-2xl">
              Students get three free trial lessons to find the right tutor.
              Tutors keep 85% of what they earn. Lernitt takes a simple 15%
              platform fee — nothing hidden.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:ml-auto">
            <Link
              to="/pricing"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition"
            >
              View pricing for students
            </Link>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/pricing#tutors";
              }}
              className="text-sm font-medium text-sky-700 hover:underline"
            >
              See how tutor payouts work →
            </button>
          </div>
        </section>

        {/* REST OF MARKETING HOMEPAGE (UNCHANGED) CONTINUES… */}
        {/* WHY LERNITT */}
        <section className="space-y-6">
          <div className="space-y-3 text-center">
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
                className={`space-y-3 rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="text-3xl">{icon}</div>
                <div className="text-lg font-semibold">{title}</div>
                <p className="text-sm opacity-80">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="space-y-6">
          <div className="space-y-3 text-center">
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
                className={`space-y-4 rounded-2xl border p-6 bg-gradient-to-br ${
                  theme === "dark"
                    ? "from-slate-900 to-slate-800 border-slate-700"
                    : "from-white to-gray-50 border-gray-200"
                } shadow-sm`}
              >
                <div className="text-4xl">{icon}</div>
                <div className="text-lg font-semibold">{title}</div>
                <p className="text-sm opacity-80">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="space-y-6">
          <div className="space-y-3 text-center">
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
                className={`space-y-3 rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <p className="text-sm italic opacity-90">“{text}”</p>
                <div className="text-xs font-semibold opacity-70">— {name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FOUNDER CREDIBILITY STRIP */}
        <section className="mt-10 rounded-xl border border-slate-200 bg-white/70 px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Built from real online teaching experience
              </p>
              <p className="text-sm font-medium mb-2">
                Built by a real online tutor, not a faceless tech company.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
                <li>
                  Over 10 years learning and tutoring online across Europe, Asia
                  and Australia.
                </li>
                <li>
                  Understands what stressed students and busy tutors actually
                  need from a lesson.
                </li>
                <li>
                  Lernitt is designed from that experience: fair earnings for
                  tutors, simple choices for students.
                </li>
              </ul>
            </div>
            <div className="text-xs md:text-sm text-muted-foreground md:text-right mt-3 md:mt-0">
              <div className="font-semibold">James, Founder of Lernitt</div>
              <div>Based in Victoria, Australia</div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="space-y-4 text-center">
          <h2 className="text-3xl font-bold">Ready to start learning?</h2>
          <p className="mx-auto max-w-md text-sm opacity-80">
            Find the perfect tutor and book your first lesson in minutes.
          </p>

          <div className="flex justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg"
            >
              Get Started
            </Link>
            <Link
              to="/tutors"
              className={`rounded-xl border px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md ${
                theme === "dark"
                  ? "border-slate-600 bg-slate-900"
                  : "border-gray-300 bg-white"
              }`}
            >
              Browse Tutors
            </Link>
          </div>
        </section>
      </main>

      <Footer theme={theme} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// LOGGED-IN HOMEPAGE (FULL CHAT 83 VERSION — PRESERVED EXACTLY)
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
            const unread = Array.isArray(ns)
              ? ns.filter((n) => !n.read).length
              : 0;
            setNotifUnread(unread);
          }
        } else {
          setNotifUnread(0);
        }

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

  const baseBg =
    theme === "dark"
      ? "bg-slate-950 text-slate-50"
      : "bg-white text-slate-900";
  const cardBg =
    theme === "dark"
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-200";
  const subtleBg =
    theme === "dark"
      ? "from-slate-900 to-slate-800 border-slate-700"
      : "from-white to-blue-50 border-gray-200";
  const avatarBg =
    theme === "dark"
      ? "bg-gradient-to-br from-indigo-500 to-sky-500"
      : "bg-gradient-to-br from-indigo-100 to-sky-200";

  // Loading
  if (loading) {
    return (
      <div className={`${baseBg} p-4 space-y-4`}>
        <h1 className="text-2xl font-bold">Welcome to Lernitt</h1>
      </div>
    );
  }

  return (
    <div className={`${baseBg} min-h-screen`}>
      <main className="mx-auto flex max-w-6xl flex-col space-y-16 px-4 pt-20 pb-20">
        {/* HERO SECTION */}
        <section className="relative flex overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-black/30" />

          <div className="relative flex w-full flex-col items-start gap-4 px-6 py-10 text-white sm:max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span>✨</span>
              <span>Try a free trial lesson</span>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
              Book live 1-to-1 lessons with expert tutors
            </h1>

            <p className="text-base opacity-90 sm:text-lg">
              Learn languages, skills, and more — with friendly tutors who teach
              you live.
            </p>

            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                I’m a student — Get started
              </Link>

              <Link
                to="/signup?type=tutor"
                className="inline-flex items-center justify-center rounded-xl border border-white px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black"
              >
                I’m a tutor — Apply to teach
              </Link>
            </div>

            <p className="text-xs opacity-80">
              Only takes a minute to sign up. No long forms.
            </p>
          </div>
        </section>

        {/* SEARCH + CATEGORIES */}
        <section>
          <div
            className={`sticky top-2 z-10 space-y-3 rounded-2xl border p-3 shadow-sm backdrop-blur ${
              theme === "dark"
                ? "bg-slate-900/95 border-slate-700"
                : "bg-white/95 border-gray-200"
            }`}
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
                  onClick={() =>
                    nav(`/tutors?q=${encodeURIComponent(label)}`)
                  }
                  className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 px-3 py-1 text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:text-sm"
                >
                  {label}
                </button>
              ))}
            </div>

            {err && <div className="text-xs text-red-500">{err}</div>}
          </div>
        </section>

        {/* TOP CARDS */}
        <section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div
              className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                cardBg
              }`}
            >
              <div className="mb-1 font-semibold">Get started</div>
              <p className="text-sm opacity-80">
                Browse tutors, book lessons, manage availability.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="rounded-xl border px-3 py-1 text-sm"
                  to="/tutors"
                >
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
            <div
              className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                cardBg
              }`}
            >
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
            <div
              className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                cardBg
              }`}
            >
              <div className="mb-1 font-semibold">Upcoming lesson</div>

              {!isAuthed && (
                <p className="text-sm opacity-80">
                  Log in to see your schedule.
                </p>
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
        </section>

        {/* POPULAR TUTORS */}
        <section className="space-y-3">
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
                    className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardBg}`}
                  >
                    <Link
                      to={`/tutors/${encodeURIComponent(id)}`}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full border text-base font-semibold shadow-inner ${avatarBg}`}
                        >
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
        </section>

        {/* POPULAR SUBJECTS */}
        <section className="space-y-4">
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
                onClick={() =>
                  nav(`/tutors?q=${encodeURIComponent(name)}`)
                }
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br ${subtleBg}`}
              >
                <span className="text-lg">{icon}</span>
                {name}
              </button>
            ))}
          </div>
        </section>

        {/* HOW LERNITT WORKS — AGAIN */}
        <section className="space-y-4">
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
        </section>

        {/* BOTTOM CARDS */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div
              className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardBg}`}
            >
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

            <div
              className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardBg}`}
            >
              <div className="mb-1 font-semibold">Students</div>
              <p className="text-sm opacity-80">Student list & bookings.</p>
              <Link
                className="mt-2 inline-block rounded-xl border px-3 py-1 text-sm"
                to="/students"
              >
                Open Students
              </Link>
            </div>

            <div
              className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardBg}`}
            >
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
        </section>
      </main>

      <Footer theme={theme} />
    </div>
  );
}
