// client/src/pages/Favourites.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTutors } from "../api/tutors";
import StarRating from "../components/StarRating.jsx";
import { copyToClipboard } from "../lib/copy.js";
import { useToast } from "../hooks/useToast.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const prefetchCache = new Map();

async function prefetchTutor(id) {
  if (prefetchCache.has(id)) return;
  prefetchCache.set(id, true);
  try {
    await Promise.allSettled([
      fetch(`${API}/api/tutors/${encodeURIComponent(id)}`),
      fetch(`${API}/api/reviews/tutor/${encodeURIComponent(id)}`),
      fetch(`${API}/api/reviews/tutor/${encodeURIComponent(id)}/summary`),
    ]);
  } catch {
    // ignore any prefetch errors
  }
}

function eurosFromPrice(p) {
  const n = typeof p === "number" ? p : Number(p) || 0;
  // Supports cents (e.g., 2500 => €25) and direct euros.
  return n >= 1000 ? n / 100 : n;
}

export default function Favourites() {
  const toast = useToast();

  const [favIds, setFavIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("favTutors") || "[]"));
    } catch {
      return new Set();
    }
  });

  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: notes per favourite (persisted)
  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favNotes") || "{}");
    } catch {
      return {};
    }
  });

  // NEW: sort dropdown
  const [sortBy, setSortBy] = useState("rating_desc");

  function saveFavs(nextSet) {
    try {
      localStorage.setItem("favTutors", JSON.stringify([...nextSet]));
    } catch {
      // ignore storage errors
    }
  }

  function toggleFavourite(id) {
    setFavIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavs(next);
      return next;
    });
  }

  async function reload() {
    setLoading(true);
    try {
      const res = await getTutors({ page: 1, limit: 200 });
      const rows = Array.isArray(res) ? res : res.data || [];
      setTutors(rows.filter((t) => favIds.has(t._id || t.id)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favIds]);

  async function onCopyFavouritesLink() {
    try {
      if (navigator?.share) {
        await navigator.share({
          title: "My favourite tutors",
          url: window.location.href,
        });
        return;
      }
    } catch {}
    const ok = await copyToClipboard(window.location.href);
    toast(ok ? "Link copied!" : "Copy failed");
  }

  // Derived: sorted favourites
  const sortedFavs = useMemo(() => {
    const list = [...tutors];
    return list.sort((a, b) => {
      const pa = eurosFromPrice(a.price);
      const pb = eurosFromPrice(b.price);
      const ra = Number(a.avgRating) || 0;
      const rb = Number(b.avgRating) || 0;
      if (sortBy === "rating_desc") return rb - ra;
      if (sortBy === "price_asc") return pa - pb;
      if (sortBy === "price_desc") return pb - pa;
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });
  }, [tutors, sortBy]);

  // Loading skeleton (upgrade)
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Favourites</h1>
          <button className="text-xs border px-2 py-1 rounded-2xl shadow-sm opacity-60 cursor-wait">
            Loading…
          </button>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="border rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-40 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-gray-200 rounded" />
              </div>
              <div className="flex gap-2 mt-2">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-12 bg-gray-200 rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const hasAny = sortedFavs.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header + copy link */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Favourites</h1>
        <button
          onClick={onCopyFavouritesLink}
          className="text-xs border px-2 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
        >
          Copy page link 🔗
        </button>
      </div>

      {/* Empty state + tip link */}
      {!hasAny && (
        <div className="border rounded-2xl p-6 text-center shadow-sm">
          <div className="font-semibold mb-1">No favourite tutors yet.</div>
          <p className="opacity-80 mb-3">Browse tutors and tap ♥ to save them here.</p>
          <Link
            to="/tutors"
            className="inline-block border px-4 py-2 rounded-2xl hover:bg-gray-50"
          >
            Find tutors →
          </Link>

          {/* NEW: empty-state friendly link */}
          <Link
            to="/tutors"
            className="mt-3 inline-block text-sm underline text-blue-600"
          >
            Browse tutors now →
          </Link>
        </div>
      )}

      {/* Controls above list when there are favourites */}
      {hasAny && (
        <div className="flex flex-wrap items-center gap-3">
          {/* NEW: sort dropdown */}
          <div className="flex gap-2 items-center">
            <label className="text-sm">Sort by:</label>
            <select
              className="border p-2 rounded-xl"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rating_desc">Rating ↓</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="name_asc">Name A–Z</option>
            </select>
          </div>

          {/* NEW: quick share button (in addition to header copy) */}
          <button
            onClick={async () => {
              try {
                if (navigator?.share) {
                  await navigator.share({
                    title: "My favourite tutors on Lernitt",
                    url: window.location.href,
                  });
                  return;
                }
              } catch {}
              try {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied!");
              } catch {
                // fallback to existing toast copy
                const ok = await copyToClipboard(window.location.href);
                toast(ok ? "Link copied!" : "Copy failed");
              }
            }}
            className="text-xs border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            Share favourites 🔗
          </button>
        </div>
      )}

      {/* Favourites list */}
      {!!hasAny && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedFavs.map((t) => {
            const tid = t._id || t.id;
            const priceEur = eurosFromPrice(t.price);
            return (
              <li
                key={tid}
                className="group relative border rounded-2xl p-4 shadow-sm hover:shadow-md transition"
              >
                {/* Unfavourite toggle */}
                <button
                  aria-label="Remove from favourites"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavourite(tid);
                  }}
                  className="absolute top-2 right-2 z-20 rounded-full border px-2 py-1 bg-white/80 backdrop-blur hover:bg-white text-sm"
                  title="Remove from favourites"
                >
                  ♥
                </button>

                {/* Whole-card link + prefetch */}
                <Link
                  to={`/tutors/${tid}`}
                  className="absolute inset-0"
                  aria-label={`Open ${t.name}`}
                  onMouseEnter={() => prefetchTutor(tid)}
                  onFocus={() => prefetchTutor(tid)}
                />

                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-semibold">
                    {t.name?.[0] || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold underline decoration-dotted group-hover:decoration-solid">
                      {t.name}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {(t.subjects || ["—"]).map((s, i) => (
                        <span key={i} className="text-xs px-2 py-1 border rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="text-sm flex items-center gap-2 mt-1">
                      <StarRating
                        value={Number(t.avgRating) || 0}
                        readOnly
                        size={16}
                        showValue
                      />
                      <span>({t.reviewsCount || 0} reviews)</span>
                    </div>
                  </div>

                  <div className="text-sm whitespace-nowrap ml-auto">
                    €{" "}
                    {typeof priceEur === "number" && Number.isFinite(priceEur)
                      ? priceEur.toFixed(2)
                      : priceEur}
                    /h
                  </div>
                </div>

                {/* NEW: personal note for this favourite */}
                <div className="relative z-10 mt-3">
                  <textarea
                    placeholder="Add a note about this tutor..."
                    className="w-full border p-2 rounded-xl text-xs"
                    value={notes[tid] || ""}
                    onChange={(e) => {
                      const next = { ...notes, [tid]: e.target.value };
                      setNotes(next);
                      try {
                        localStorage.setItem("favNotes", JSON.stringify(next));
                      } catch {}
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
