// client/src/pages/Tutors.jsx
import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js"; // ✅ fixed import path
import StarRating from "../components/StarRating.jsx";
import { copyToClipboard } from "../lib/copy.js";
import { useToast } from "../hooks/useToast.js";

const prefetchCache = new Map();
async function prefetchTutor(id) {
  if (prefetchCache.has(id)) return;
  prefetchCache.set(id, true);
  try {
    await Promise.allSettled([
      apiFetch(`/api/tutors/${encodeURIComponent(id)}`),
      apiFetch(`/api/reviews/tutor/${encodeURIComponent(id)}`),
      apiFetch(`/api/reviews/tutor/${encodeURIComponent(id)}/summary`),
    ]);
  } catch {
    // ignore any prefetch errors
  }
}

export default function Tutors() {
  const [params, setParams] = useSearchParams();
  const loc = useLocation();

  const [q, setQ] = useState(params.get("q") || "");
  const [subject, setSubject] = useState(params.get("subject") || "");
  const [minRating, setMinRating] = useState(params.get("minRating") || "");
  const [priceMin, setPriceMin] = useState(params.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(params.get("priceMax") || "");
  const [page, setPage] = useState(Number(params.get("page") || 1));
  const [limit, setLimit] = useState(Number(params.get("limit") || 10));
  const [sortBy, setSortBy] = useState(params.get("sortBy") || "rating_desc");

  // NEW: additional maxPrice dropdown (works alongside priceMax input)
  const [maxPrice, setMaxPrice] = useState(0);

  // Favourites (persisted to localStorage)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("favTutors") || "[]");
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  });
  const [showFavsOnly, setShowFavsOnly] = useState(false);

  const [tutors, setTutors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toast = useToast();

  function clearFilters() {
    setQ("");
    setSubject("");
    setMinRating("");
    setPriceMin("");
    setPriceMax("");
    setMaxPrice(0);
    setPage(1);
    load(1, { q: "", subject: "", minRating: "", priceMin: "", priceMax: "" });
  }

  function eurosFromPrice(p) {
    const n = typeof p === "number" ? p : Number(p) || 0;
    // If backend gives cents (e.g., 2500), convert to euros
    return n >= 1000 ? n / 100 : n;
  }

  function applyClientFilters(all, overrides) {
    const { q, subject, minRating, priceMin, priceMax } = overrides;
    return all.filter((t) => {
      const name = String(t.name || "");
      const bio = String(t.bio || "");
      const subjects = Array.isArray(t.subjects) ? t.subjects : [];
      const rating = Number(t.avgRating) || 0;
      const priceEur = eurosFromPrice(t.price);

      if (q) {
        const hay = `${name} ${bio} ${subjects.join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (subject && !subjects.includes(subject)) return false;
      if (minRating && rating < Number(minRating)) return false;
      if (priceMin && priceEur < Number(priceMin)) return false;
      if (priceMax && priceEur > Number(priceMax)) return false;
      // NEW: extra cap from the dropdown
      if (maxPrice && priceEur > maxPrice) return false;

      return true;
    });
  }

  async function load(
    p = page,
    overrides = { q, subject, minRating, priceMin, priceMax }
  ) {
    setLoading(true);
    setError("");
    try {
      // ✅ apiFetch returns parsed JSON directly
      const data = await apiFetch(`/api/tutors`);
      const rows = Array.isArray(data) ? data : data.data || [];
      // Client-side filtering + pagination in mock mode
      const filtered = applyClientFilters(rows, overrides);
      const totalNext = filtered.length;
      const start = (p - 1) * limit;
      const pageRows = filtered.slice(start, start + limit);

      setTutors(pageRows);
      setTotal(totalNext);

      setParams((sp) => {
        const next = new URLSearchParams(sp);
        overrides.q ? next.set("q", overrides.q) : next.delete("q");
        overrides.subject
          ? next.set("subject", overrides.subject)
          : next.delete("subject");
        overrides.minRating
          ? next.set("minRating", overrides.minRating)
          : next.delete("minRating");
        overrides.priceMin
          ? next.set("priceMin", overrides.priceMin)
          : next.delete("priceMin");
        overrides.priceMax
          ? next.set("priceMax", overrides.priceMax)
          : next.delete("priceMax");
        next.set("page", String(p));
        next.set("limit", String(limit));
        sortBy ? next.set("sortBy", sortBy) : next.delete("sortBy");
        return next;
      });
    } catch (e) {
      console.error(e);
      setError("Could not load tutors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  useEffect(() => {
    if (!loading) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loading]);

  useEffect(() => {
    setParams((sp) => {
      const next = new URLSearchParams(sp);
      sortBy ? next.set("sortBy", sortBy) : next.delete("sortBy");
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Debounce: q
  useEffect(() => {
    const h = setTimeout(() => {
      setPage(1);
      load(1);
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Debounce: subject, rating, price (+ NEW maxPrice)
  useEffect(() => {
    const h = setTimeout(() => {
      setPage(1);
      load(1);
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, minRating, priceMin, priceMax, maxPrice]);

  useEffect(() => {
    try {
      localStorage.setItem("favTutors", JSON.stringify([...favorites]));
    } catch {}
  }, [favorites]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const sortedTutors = useMemo(() => {
    const arr = [...tutors];
    const pa = (t) => eurosFromPrice(t.price);
    const ra = (t) => Number(t.avgRating) || 0;
    if (sortBy === "rating_desc") return arr.sort((a, b) => ra(b) - ra(a));
    if (sortBy === "price_asc") return arr.sort((a, b) => pa(a) - pa(b));
    if (sortBy === "price_desc") return arr.sort((a, b) => pa(b) - pa(a));
    if (sortBy === "name_asc")
      return arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return arr;
  }, [tutors, sortBy]);

  const displayedTutors = showFavsOnly
    ? sortedTutors.filter((t) => favorites.has(t._id || t.id))
    : sortedTutors;

  const hasFilters =
    q || subject || minRating || priceMin || priceMax || maxPrice;

  function clearAndApply(key) {
    const next = { q, subject, minRating, priceMin, priceMax };
    if (key === "Q") {
      next.q = "";
      setQ("");
    }
    if (key === "Subject") {
      next.subject = "";
      setSubject("");
    }
    if (key === "MinRating") {
      next.minRating = "";
      setMinRating("");
    }
    if (key === "PriceMin") {
      next.priceMin = "";
      setPriceMin("");
    }
    if (key === "PriceMax") {
      next.priceMax = "";
      setPriceMax("");
    }
    setPage(1);
    load(1, next);
  }

  function toggleFavorite(id) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCopySearchLink() {
    try {
      if (navigator?.share) {
        await navigator.share({
          title: "Lernitt search",
          url: window.location.href,
        });
        return;
      }
    } catch {}
    const ok = await copyToClipboard(window.location.href);
    toast(ok ? "Link copied!" : "Copy failed");
  }

  // NEW: quick subject filter handler
  function handleQuickSubjectClick(subj) {
    const nextSubject = subj === subject ? "" : subj;
    setSubject(nextSubject);
    const overrides = {
      q,
      subject: nextSubject,
      minRating,
      priceMin,
      priceMax,
    };
    setPage(1);
    load(1, overrides);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tutors</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/favourites"
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            Favourites ♥
          </Link>
          <button
            type="button"
            onClick={clearFilters}
            className="border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition text-sm"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* NEW: Subject quick filter bar */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="opacity-70">Popular subjects:</span>
        {["English", "Spanish", "Maths", "Piano"].map((subj) => {
          const active = subject === subj;
          return (
            <button
              key={subj}
              type="button"
              onClick={() => handleQuickSubjectClick(subj)}
              className={[
                "px-3 py-1 rounded-2xl border text-xs md:text-sm transition",
                active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              {subj}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const overrides = { q, subject, minRating, priceMin, priceMax };
          setPage(1);
          load(1, overrides);
        }}
        className="grid gap-2 md:grid-cols-6"
      >
        {/* Search with clear (×) */}
        <div className="relative md:col-span-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tutors…"
            className="w-full border p-2 pr-8 rounded-xl"
          />
        </div>

        {/* Subject with clear (×) */}
        <div className="relative">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border p-2 pr-8 rounded-xl appearance-none"
          >
            <option value="">Any subject</option>
            <option value="English">English</option>
            <option value="IELTS">IELTS</option>
            <option value="Business English">Business English</option>
            {/* NEW subjects to align with quick filters */}
            <option value="Spanish">Spanish</option>
            <option value="Maths">Maths</option>
            <option value="Piano">Piano</option>
          </select>
        </div>

        {/* Rating with clear (×) */}
        <div className="relative">
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="w-full border p-2 pr-8 rounded-xl appearance-none"
          >
            <option value="">Any rating</option>
            <option value="4.0">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
        </div>

        {/* Min € with clear (×) */}
        <div className="relative">
          <input
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Min €"
            className="w-full border p-2 pr-8 rounded-xl"
            inputMode="numeric"
          />
        </div>

        {/* Max € with clear (×) */}
        <div className="relative">
          <input
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Max €"
            className="w-full border p-2 pr-8 rounded-xl"
            inputMode="numeric"
          />
        </div>

        <div className="flex gap-2 md:col-span-6">
          <button className="border px-3 py-2 rounded-2xl shadow-sm hover:shadow-md transition">
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="border px-3 py-2 rounded-2xl hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </form>

      {/* NEW: Extra max price dropdown (simple helper cap) */}
      <div>
        <label className="text-sm">
          Max price:{" "}
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="border p-1 rounded"
          >
            <option value={0}>Any</option>
            <option value={10}>€10</option>
            <option value={20}>€20</option>
            <option value={30}>€30</option>
            <option value={50}>€50</option>
          </select>
        </label>
      </div>

      {/* Sort + Per page + Favourites filter */}
      <div className="flex flex-wrap gap-4 items-center">
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

        <div className="flex gap-2 items-center">
          <label className="text-sm">Per page:</label>
          <select
            className="border p-2 rounded-xl"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
              load(1);
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <label className="text-sm inline-flex items-center gap-2 ml-auto">
          <input
            type="checkbox"
            checked={showFavsOnly}
            onChange={(e) => setShowFavsOnly(e.target.checked)}
          />
          Show favourites only
        </label>
      </div>

      {/* Filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <button
              className="text-xs px-2 py-1 border rounded-full"
              onClick={() => clearAndApply("Q")}
            >
              q: {q} ✕
            </button>
          )}
          {subject && (
            <button
              className="text-xs px-2 py-1 border rounded-full"
              onClick={() => clearAndApply("Subject")}
            >
              subject: {subject} ✕
            </button>
          )}
          {minRating && (
            <button
              className="text-xs px-2 py-1 border rounded-full"
              onClick={() => clearAndApply("MinRating")}
            >
              min ⭐ {minRating} ✕
            </button>
          )}
          {priceMin && (
            <button
              className="text-xs px-2 py-1 border rounded-full"
              onClick={() => clearAndApply("PriceMin")}
            >
              min € {priceMin} ✕
            </button>
          )}
          {priceMax && (
            <button
              className="text-xs px-2 py-1 border rounded-full"
              onClick={() => clearAndApply("PriceMax")}
            >
              max € {priceMax} ✕
            </button>
          )}
          {maxPrice ? (
            <span className="text-xs px-2 py-1 border rounded-full bg-blue-50">
              cap € {maxPrice}
            </span>
          ) : null}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="border rounded-2xl p-4 shadow-sm animate-pulse bg-white"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-40 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
              <div className="h-3 w-24 bg-gray-200 rounded mt-3" />
            </li>
          ))}
        </ul>
      )}

      {/* Error */}
      {error && !loading && <div className="text-red-600">{error}</div>}

      {/* Empty state */}
      {!loading && !error && tutors.length === 0 && (
        <div className="border rounded-2xl p-8 text-center shadow-sm bg-white">
          <div className="text-lg font-semibold mb-2">No tutors found</div>
          <p className="opacity-80 mb-4">
            Try clearing filters or changing your search.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={clearFilters}
              className="border px-4 py-2 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              Clear filters
            </button>
            <button
              onClick={() => load(1)}
              className="border px-4 py-2 rounded-2xl hover:bg-gray-50"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && tutors.length > 0 && (
        <>
          <div className="text-sm opacity-70 mb-2">
            {total} tutor{total === 1 ? "" : "s"} found
          </div>

          <div className="flex justify-end">
            <button
              onClick={onCopySearchLink}
              className="text-xs border px-2 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              Copy search link 🔗
            </button>
          </div>

          {!showFavsOnly ? (
            <div className="text-xs opacity-60">
              Showing {Math.min((page - 1) * limit + 1, total)}–
              {Math.min(page * limit, total)} of {total}
            </div>
          ) : (
            <div className="text-xs opacity-60">
              Showing {displayedTutors.length} favourite
              {displayedTutors.length === 1 ? "" : "s"}
            </div>
          )}

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {displayedTutors.map((t) => {
              const tid = t._id || t.id;
              const isFav = favorites.has(tid);
              return (
                <li
                  key={tid}
                  title={`Open ${t.name}`}
                  className="group relative border rounded-2xl bg-white p-4 pt-5 shadow-sm hover:shadow-md transition hover:ring-1 hover:ring-gray-200 focus-within:ring-2"
                >
                  {/* Subtle top banner */}
                  <div className="absolute inset-x-0 top-0 h-12 bg-slate-50 pointer-events-none" />

                  {/* Favourite toggle (on top) */}
                  <button
                    aria-label={
                      isFav
                        ? "Remove from favourites"
                        : "Add to favourites"
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(tid);
                    }}
                    className="absolute top-2 right-2 z-20 rounded-full border px-2 py-1 bg-white/80 backdrop-blur hover:bg-white text-sm"
                  >
                    {isFav ? "♥" : "♡"}
                  </button>

                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-full border flex items-center justify-center text-base font-semibold bg-white shadow-sm">
                          {t.name?.[0] || "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-base font-semibold truncate">
                            {t.name}
                          </div>
                          <div className="text-xs opacity-70 truncate">
                            {(t.subjects || [])
                              .slice(0, 3)
                              .join(" · ") || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-1">
                        {(t.subjects || ["—"]).map((s, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 border rounded-full bg-white"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="text-sm flex items-center gap-2 mt-1">
                        <StarRating
                          value={
                            typeof t.avgRating === "number"
                              ? t.avgRating
                              : 0
                          }
                          readOnly
                          size={16}
                          showValue
                        />
                        <span className="text-xs opacity-80">
                          ({t.reviewsCount || 0} reviews)
                        </span>
                        {/* NEW: Write a review shortcut */}
                        <Link
                          to={`/tutors/${tid}?review=1`}
                          className="text-xs underline opacity-80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Write a review
                        </Link>
                      </div>
                    </div>

                    {/* RIGHT COLUMN (PRICE + BUTTONS) */}
                    <div className="flex flex-col gap-1.5 ml-2 w-24 text-xs">
                      <div className="mt-6 text-sm font-semibold whitespace-nowrap self-end">
                        €{" "}
                        {(() => {
                          const p = eurosFromPrice(t.price);
                          return typeof p === "number"
                            ? p.toFixed(2)
                            : p;
                        })()}
                        /h
                      </div>

                      {/* NEW: Trial badge */}
                      <div className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full w-full text-center">
                        Trial available
                      </div>

                      {/* NEW: Quick Trial → preselect trial in booking */}
                      <Link
                        to={`/book/${tid}`}
                        state={{ tutor: t, trial: true }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-20 border px-2 py-1 rounded-xl shadow-sm hover:shadow-md transition bg-white w-full text-center"
                      >
                        Trial →
                      </Link>
                      {/* Book button → sends tutor + current location to /book/:tutorId */}
                      <Link
                        to={`/book/${tid}`}
                        state={{
                          tutor: t,
                          from: {
                            pathname: loc.pathname,
                            search: loc.search,
                          },
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-20 border px-2 py-1 rounded-2xl shadow-sm hover:shadow-md transition bg-white w-full text-center"
                      >
                        Book
                      </Link>
                      {/* NEW: View profile button */}
                      <Link
                        to={`/tutors/${tid}`}
                        state={{ from: `${loc.pathname}${loc.search}` }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => prefetchTutor(tid)}
                        onFocus={() => prefetchTutor(tid)}
                        className="relative z-20 border px-2 py-1 rounded-2xl shadow-sm hover:shadow-md transition bg-white w-full text-center"
                      >
                        View profile
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-end">
            <button
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
              className="mt-2 border px-3 py-2 rounded-2xl shadow-sm hover:shadow-md transition text-sm"
            >
              Back to top ↑
            </button>
          </div>
        </>
      )}

      {!loading && tutors.length > 0 && !showFavsOnly && (
        <div className="flex gap-2 pt-2 items-center justify-center">
          <input
            className="border px-2 py-1 rounded w-16 text-center"
            type="number"
            min="1"
            max={totalPages}
            placeholder="Go"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = Math.min(
                  Math.max(1, Number(e.currentTarget.value || 1)),
                  totalPages
                );
                setPage(n);
                load(n);
              }
            }}
          />
          <button
            className="border px-3 py-1 rounded-2xl"
            onClick={() => {
              const n = Math.max(1, page - 1);
              setPage(n);
              load(n);
            }}
            disabled={loading || page === 1}
          >
            Previous
          </button>
          <span className="px-2 py-1">
            Page {page} / {totalPages}
          </span>
          <button
            className="border px-3 py-1 rounded-2xl"
            onClick={() => {
              const n = Math.min(totalPages, page + 1);
              setPage(n);
              load(n);
            }}
            disabled={loading || page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
