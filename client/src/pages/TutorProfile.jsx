// client/src/pages/TutorProfile.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { copyToClipboard } from "../lib/copy.js";
import { useToast } from "../hooks/useToast.js";
import ReviewForm from "../components/ReviewForm.jsx";

const MOCK = import.meta.env.VITE_MOCK === "1";

// --- Favourites helpers ---
const FAV_KEY = "favTutors";
function readFavs() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}
// --- end helpers ---

function eurosFromPrice(p) {
  const n = typeof p === "number" ? p : Number(p) || 0;
  return n >= 1000 ? n / 100 : n; // cents → €
}

/* ---------------- Trials badge (new) ---------------- */
function TrialsBadge({ tutorId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await apiFetch(
          `/api/lessons/trials/summary?tutorId=${encodeURIComponent(tutorId)}`,
          { auth: true }
        );
        if (live) setData(res);
      } catch {}
    })();
    return () => { live = false; };
  }, [tutorId]);

  if (!data) return null;

  return (
    <span className="text-xs border rounded-full px-2 py-1">
      Trials {data.totalUsed}/{data.limitTotal} • This tutor {data.usedWithTutor}/{data.limitPerTutor}
    </span>
  );
}

/* ---------------- Reviews Panel ---------------- */

function ReviewsPanel({ tutorId, tutorName }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ avgRating: 0, reviewsCount: 0 });
  const [canReview, setCanReview] = useState(false);

  const openFromQuery = searchParams.get("review") === "1";
  const [showForm, setShowForm] = useState(openFromQuery);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const [list, sum] = await Promise.all([
          apiFetch(`/api/reviews/tutor/${encodeURIComponent(tutorId)}`),
          apiFetch(`/api/reviews/tutor/${encodeURIComponent(tutorId)}/summary`),
        ]);
        setItems(Array.isArray(list) ? list : []);
        setSummary({
          avgRating: Number(sum?.avgRating || 0),
          reviewsCount: Number(sum?.reviewsCount || 0),
        });
      } catch (e) {
        setErr(e.message || "Failed to load reviews.");
      } finally {
        setLoading(false);
      }
    }
    async function checkCanReview() {
      try {
        const res = await apiFetch(
          `/api/reviews/can-review?tutorId=${encodeURIComponent(tutorId)}`,
          { auth: true }
        );
        setCanReview(!!res?.canReview);
      } catch {
        setCanReview(false);
      }
    }
    if (tutorId) {
      load();
      checkCanReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorId]);

  function onSaved() {
    (async () => {
      try {
        const list = await apiFetch(`/api/reviews/tutor/${encodeURIComponent(tutorId)}`);
        const sum = await apiFetch(`/api/reviews/tutor/${encodeURIComponent(tutorId)}/summary`);
        setItems(Array.isArray(list) ? list : []);
        setSummary({
          avgRating: Number(sum?.avgRating || 0),
          reviewsCount: Number(sum?.reviewsCount || 0),
        });
        setShowForm(false);
        if (openFromQuery) {
          const next = new URLSearchParams(searchParams);
          next.delete("review");
          setSearchParams(next, { replace: true });
        }
      } catch {}
    })();
  }

  return (
    <section id="reviews-panel" className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <span className="text-sm opacity-70">
          {summary.reviewsCount} review{summary.reviewsCount === 1 ? "" : "s"}
          {summary.reviewsCount > 0 ? ` • ${summary.avgRating.toFixed(1)}/5` : ""}
        </span>
        {canReview && (
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto text-sm border px-3 py-1 rounded-2xl"
          >
            Write a review
          </button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-2xl p-3">
          <ReviewForm
            tutorId={tutorId}
            tutorName={tutorName}
            onSaved={onSaved}
            onClose={() => {
              setShowForm(false);
              if (openFromQuery) {
                const next = new URLSearchParams(searchParams);
                next.delete("review");
                setSearchParams(next, { replace: true });
              }
            }}
          />
        </div>
      )}

      {loading && <div>Loading reviews…</div>}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && items.length === 0 && (
        <div className="opacity-70">No reviews yet.</div>
      )}

      {!loading && !err && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id || r._id} className="border rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <div className="font-medium">{r.student || "Student"}</div>
                <div className="text-xs opacity-70">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                </div>
                <div className="ml-auto text-sm">★ {Number(r.rating || 0).toFixed(1)}/5</div>
              </div>
              {r.text && <div className="text-sm mt-1">{r.text}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Main page ---------------- */

export default function TutorProfile() {
  const { id } = useParams();
  const loc = useLocation();
  const backTo = (loc.state && loc.state.from) || "/tutors";

  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const toast = useToast();

  // Favourites state (persisted to localStorage)
  const [favorites, setFavorites] = useState(readFavs());
  const isFav = favorites.has(id);

  // Trial banner via ?trial=1
  const searchParams = new URLSearchParams(loc.search || "");
  const trialParam = searchParams.get("trial");
  const [showTrialBanner, setShowTrialBanner] = useState(trialParam === "1");

  function toggleFavorite() {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  // keep favourites in sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === FAV_KEY) setFavorites(readFavs());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // refresh favourites when navigating
  useEffect(() => {
    setFavorites(readFavs());
  }, [id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      // Tutor only (reviews+summary handled by ReviewsPanel)
      const t = await apiFetch(`/api/tutors/${encodeURIComponent(id)}`);
      setTutor(t);
    } catch (e) {
      console.error("[TutorProfile] load error:", e);
      setError("Could not load tutor profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Document title: "Name — 4.8⭐ | Lernitt" (use tutor.avgRating if present)
  useEffect(() => {
    if (!tutor) return;
    const avgNumeric =
      typeof tutor.avgRating === "number" ? Number(tutor.avgRating) : null;
    const name = tutor.name || "Tutor";
    const newTitle =
      avgNumeric != null && !Number.isNaN(avgNumeric)
        ? `${name} — ${avgNumeric.toFixed(1)}⭐ | Lernitt`
        : `${name} — Tutor | Lernitt`;
    const prev = document.title;
    document.title = newTitle;
    return () => {
      document.title = prev || "Lernitt";
    };
  }, [tutor]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!tutor) return <div className="p-4">Tutor not found.</div>;

  const priceText =
    typeof tutor.price === "number"
      ? eurosFromPrice(tutor.price).toFixed(2)
      : String(tutor.price || "");

  async function onCopyProfileLink() {
    try {
      if (navigator?.share) {
        await navigator.share({
          title: tutor.name || "Lernitt tutor",
          url: window.location.href,
        });
        return;
      }
    } catch {}
    const ok = await copyToClipboard(window.location.href);
    toast(ok ? "Link copied!" : "Copy failed");
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tutor.name}</h1>
        <div className="flex items-center gap-2">
          <Link to={backTo} className="text-sm underline">
            ← Back to tutors
          </Link>
          <button
            onClick={onCopyProfileLink}
            className="text-xs border px-2 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            Copy profile link 🔗
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
            className="text-xs border px-2 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
            title={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            {isFav ? "♥ In favourites" : "♡ Add to favourites"}
          </button>
        </div>
      </div>

      {/* Trial success banner */}
      {showTrialBanner && (
        <div className="flex items-start gap-3 p-3 rounded-xl border shadow-sm bg-green-50 border-green-200">
          <div>🎉 <b>Trial booked!</b> Your 30-minute session is confirmed.</div>
          <button
            onClick={() => setShowTrialBanner(false)}
            className="ml-auto text-xs border px-2 py-1 rounded-2xl hover:bg-white"
            aria-label="Dismiss"
            title="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Basic profile card */}
      <div className="grid gap-4 md:grid-cols-[auto,1fr] items-start">
        {tutor.avatar ? (
          <img
            src={tutor.avatar}
            alt="Avatar"
            className="w-32 h-32 rounded-full object-cover border shadow-sm"
          />
        ) : (
          <div className="w-32 h-32 rounded-full border shadow-sm flex items-center justify-center text-2xl font-semibold">
            {tutor.name?.[0] || "?"}
          </div>
        )}
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Subjects:</span>{" "}
            {tutor.subjects?.length ? tutor.subjects.join(", ") : "—"}
          </div>
          <div className="text-sm">
            <span className="font-medium">Price:</span>{" "}
            {priceText ? `${priceText} €` : "—"}
          </div>
          {tutor.bio && (
            <div className="text-sm whitespace-pre-line">{tutor.bio}</div>
          )}
          <div className="pt-2 flex items-center gap-2">
            <Link
              to={`/book/${tutor.id || tutor._id || id}`}
              state={{ tutor, from: { pathname: loc.pathname, search: loc.search } }}
              className="btn btn-primary"
            >
              Book Lesson
            </Link>
            <TrialsBadge tutorId={tutor._id || tutor.id || id} />
          </div>
        </div>
      </div>

      {/* Reviews section */}
      {tutor && (
        <ReviewsPanel tutorId={tutor._id || tutor.id || id} tutorName={tutor.name} />
      )}
    </div>
  );
}
