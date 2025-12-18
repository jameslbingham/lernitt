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

// Format price
function eurosFromPrice(p) {
  const n = typeof p === "number" ? p : Number(p) || 0;
  return n >= 1000 ? n / 100 : n;
}

/* ---------------- Trials badge ---------------- */
function TrialsBadge({ tutorId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const raw = await apiFetch(
          `/api/lessons/trial-summary/${encodeURIComponent(tutorId)}`,
          { auth: true }
        );
        if (!live || !raw) return;

        const totalUsed = Number(raw.totalTrials ?? raw.totalUsed ?? 0);
        const usedWithTutor = raw.usedWithTutor ? 1 : 0;

        setData({
          totalUsed,
          usedWithTutor,
          limitTotal: 3,
          limitPerTutor: 1,
        });
      } catch {
        if (live) setData(null);
      }
    })();

    return () => {
      live = false;
    };
  }, [tutorId]);

  if (!data) return null;

  return (
    <span className="text-xs border rounded-full px-2 py-1">
      Trials {data.totalUsed}/{data.limitTotal} • This tutor{" "}
      {data.usedWithTutor}/{data.limitPerTutor}
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
          apiFetch(
            `/api/reviews/tutor/${encodeURIComponent(tutorId)}/summary`
          ),
        ]);
        setItems(Array.isArray(list) ? list : []);
        setSummary({
          avgRating: Number(sum?.avgRating || 0),
          reviewsCount: Number(sum?.reviewsCount || 0),
        });
      } catch (e) {
        // NEW: fail safely, no scary "server_error" text
        console.error("Failed to load reviews", e);
        setItems([]);
        setSummary({ avgRating: 0, reviewsCount: 0 });
        setErr(""); // keep empty so we show the "no reviews" message instead
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
  }, [tutorId]);

  function onSaved() {
    (async () => {
      try {
        const list = await apiFetch(
          `/api/reviews/tutor/${encodeURIComponent(tutorId)}`
        );
        const sum = await apiFetch(
          `/api/reviews/tutor/${encodeURIComponent(tutorId)}/summary`
        );
        setItems(Array.isArray(list) ? list : []);
        setSummary({
          avgRating: Number(sum?.avgRating || 0),
          reviewsCount: Number(sum?.reviewsCount || 0),
        });
        setShowForm(false);
      } catch {}
    })();
  }

  return (
    <section id="reviews-panel" className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <span className="text-sm opacity-70">
          {summary.reviewsCount} review
          {summary.reviewsCount === 1 ? "" : "s"}
          {summary.reviewsCount > 0
            ? ` • ${summary.avgRating.toFixed(1)}/5`
            : ""}
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
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {loading && <div>Loading reviews…</div>}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && items.length === 0 && (
        <div className="opacity-70">Tutor has no reviews yet.</div>
      )}

      {!loading && !err && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r._id || r.id} className="border rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <div className="font-medium">{r.student || "Student"}</div>
                <div className="text-xs opacity-70">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleString()
                    : ""}
                </div>
                <div className="ml-auto text-sm">
                  ★ {Number(r.rating || 0).toFixed(1)}/5
                </div>
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
  const toast = useToast();

  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [favorites, setFavorites] = useState(readFavs());
  const isFav = favorites.has(id);

  const searchParams = new URLSearchParams(loc.search || "");
  const trialParam = searchParams.get("trial");
  const [showTrialBanner, setShowTrialBanner] = useState(trialParam === "1");

  function toggleFavorite() {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === FAV_KEY) setFavorites(readFavs());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setFavorites(readFavs());
  }, [id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const t = await apiFetch(`/api/tutors/${encodeURIComponent(id)}`);
      setTutor(t);
    } catch {
      setError("Could not load tutor profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  // Document title
  useEffect(() => {
    if (!tutor) return;
    const avg =
      typeof tutor.avgRating === "number"
        ? tutor.avgRating.toFixed(1)
        : null;
    document.title = avg
      ? `${tutor.name} — ${avg}⭐ | Lernitt`
      : `${tutor.name} — Tutor | Lernitt`;
  }, [tutor]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!tutor) return <div className="p-4">Tutor not found.</div>;

  const priceText =
    typeof tutor.price === "number"
      ? eurosFromPrice(tutor.price).toFixed(2)
      : String(tutor.price || "");

  async function onCopyProfileLink() {
    const ok = await copyToClipboard(window.location.href);
    toast(ok ? "Link copied!" : "Copy failed");
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* Trial banner */}
      {showTrialBanner && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <div>
            🎉 <b>Trial booked!</b> Your 30-minute lesson is confirmed.
          </div>
          <button
            onClick={() => setShowTrialBanner(false)}
            className="ml-auto text-xs border px-2 py-1 rounded-2xl"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Centered header */}
      <div className="text-center space-y-3">
        {/* Square / rounded-corner photo */}
        {tutor.avatar ? (
          <img
            src={tutor.avatar}
            alt="Tutor"
            className="w-40 h-40 object-cover rounded-2xl mx-auto border shadow-sm"
          />
        ) : (
          <div className="w-40 h-40 rounded-2xl mx-auto border shadow-sm flex items-center justify-center text-4xl font-semibold">
            {tutor.name?.[0] || "?"}
          </div>
        )}

        <h1 className="text-3xl font-bold">{tutor.name}</h1>

        <div className="text-sm opacity-80">
          {tutor.subjects?.length ? tutor.subjects.join(", ") : "—"}
        </div>

        {tutor.avgRating != null && (
          <div className="text-sm">
            ⭐ {tutor.avgRating.toFixed(1)} / 5
          </div>
        )}

        <div className="text-lg font-semibold">
          {priceText ? `${priceText} € / hour` : "—"}
        </div>

        {/* Buttons */}
        <div className="flex justify-center flex-wrap gap-2 pt-2">
          <Link
            to={`/book/${tutor._id || tutor.id || id}`}
            state={{ tutor, from: { pathname: loc.pathname, search: loc.search } }}
            className="border px-4 py-2 rounded-2xl text-sm hover:shadow-md transition"
          >
            Book Lesson
          </Link>

          <button
            onClick={toggleFavorite}
            className="border px-4 py-2 rounded-2xl text-sm hover:shadow-md transition"
          >
            {isFav ? "♥ In favourites" : "♡ Add to favourites"}
          </button>

          <button
            onClick={onCopyProfileLink}
            className="border px-4 py-2 rounded-2xl text-sm hover:shadow-md transition"
          >
            Share profile 🔗
          </button>

          <TrialsBadge tutorId={tutor._id || tutor.id || id} />
        </div>

        <Link to={backTo} className="text-sm underline block pt-2">
          ← Back to tutors
        </Link>
      </div>

      {/* Bio */}
      {tutor.bio && (
        <div className="p-4 border rounded-2xl whitespace-pre-line text-sm">
          {tutor.bio}
        </div>
      )}

      {/* Reviews panel */}
      <ReviewsPanel tutorId={tutor._id || tutor.id || id} tutorName={tutor.name} />
    </div>
  );
}
