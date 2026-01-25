// client/src/pages/TutorProfile.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { copyToClipboard } from "../lib/copy.js";
import { useToast } from "../hooks/useToast.js";
import { useAuth } from "../hooks/useAuth.jsx"; // ✅ NEW: Added for credit check
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

// Format price (supports cents or plain number/string)
function eurosFromPrice(p) {
  const n =
    typeof p === "number"
      ? p
      : typeof p === "string"
      ? Number(p)
      : Number(p) || 0;
  // If backend gives cents (e.g., 2500), convert to euros
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
        const avg = Number(sum?.avgRating || 0);
        const count = Number(sum?.reviewsCount || 0);

        setItems(Array.isArray(list) ? list : []);
        setSummary({
          avgRating: Number.isFinite(avg) ? avg : 0,
          reviewsCount: Number.isFinite(count) ? count : 0,
        });
      } catch (e) {
        console.error("Failed to load reviews", e);
        setItems([]);
        setSummary({ avgRating: 0, reviewsCount: 0 });
        setErr(""); 
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

  function updateSearchWithoutReview() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("review");
      return next;
    });
  }

  function openForm() {
    setShowForm(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("review", "1");
      return next;
    });
  }

  function closeForm() {
    setShowForm(false);
    updateSearchWithoutReview();
  }

  function onSaved() {
    (async () => {
      try {
        const list = await apiFetch(
          `/api/reviews/tutor/${encodeURIComponent(tutorId)}`
        );
        const sum = await apiFetch(
          `/api/reviews/tutor/${encodeURIComponent(tutorId)}/summary`
        );
        const avg = Number(sum?.avgRating || 0);
        const count = Number(sum?.reviewsCount || 0);

        setItems(Array.isArray(list) ? list : []);
        setSummary({
          avgRating: Number.isFinite(avg) ? avg : 0,
          reviewsCount: Number.isFinite(count) ? count : 0,
        });
        closeForm();
      } catch {
        // ignore
      }
    })();
  }

  const avgDisplay = Number.isFinite(summary.avgRating)
    ? summary.avgRating.toFixed(1)
    : "0.0";

  return (
    <section id="reviews-panel" className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <span className="text-sm opacity-70">
          {summary.reviewsCount} review
          {summary.reviewsCount === 1 ? "" : "s"}
          {summary.reviewsCount > 0 ? ` • ${avgDisplay}/5` : ""}
        </span>

        {canReview && (
          <button
            onClick={openForm}
            className="ml-auto text-sm border px-3 py-1 rounded-2xl transition hover:bg-slate-50"
          >
            Write a review
          </button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-2xl p-3 bg-slate-50/50">
          <ReviewForm
            tutorId={tutorId}
            tutorName={tutorName}
            onSaved={onSaved}
            onClose={closeForm}
          />
        </div>
      )}

      {loading && <div className="animate-pulse">Loading reviews…</div>}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && items.length === 0 && (
        <div className="opacity-70 italic text-sm">Tutor has no reviews yet.</div>
      )}

      {!loading && !err && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r._id || r.id} className="border rounded-2xl p-4 bg-white shadow-sm">
              <div className="flex items-center gap-2">
                <div className="font-bold text-slate-900">{r.student || "Student"}</div>
                <div className="text-[10px] uppercase font-black tracking-widest opacity-40">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString()
                    : ""}
                </div>
                <div className="ml-auto text-xs font-black text-amber-500">
                  ★ {Number(r.rating || 0).toFixed(1)}
                </div>
              </div>
              {r.text && <div className="text-sm mt-2 text-slate-600 leading-relaxed">{r.text}</div>}
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
  const { user } = useAuth(); // Access user profile for credit check

  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [favorites, setFavorites] = useState(readFavs());
  const isFav = favorites.has(id);

  const searchParams = new URLSearchParams(loc.search || "");
  const trialParam = searchParams.get("trial");
  const [showTrialBanner, setShowTrialBanner] = useState(trialParam === "1");

  // ✅ AUTHORITATIVE CREDIT CALCULATION
  const tutorCredits = useMemo(() => {
    if (!user || !user.packageCredits) return 0;
    const entry = user.packageCredits.find(c => String(c.tutorId) === String(id));
    return entry ? entry.count : 0;
  }, [user, id]);

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

  useEffect(() => {
    if (!tutor) return;
    const ratingNum = Number(tutor.avgRating);
    const avg = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : null;
    document.title = avg
      ? `${tutor.name} — ${avg}⭐ | Lernitt`
      : `${tutor.name} — Tutor | Lernitt`;
  }, [tutor]);

  if (loading) return <div className="p-10 text-center animate-pulse">Synchronizing Profile…</div>;
  if (error) return <div className="p-4 text-red-600 font-bold">{error}</div>;
  if (!tutor) return <div className="p-4">Tutor data not found.</div>;

  const priceNumber = Number(tutor.price);
  const priceValue = Number.isFinite(priceNumber)
    ? eurosFromPrice(priceNumber).toFixed(2)
    : tutor.price
    ? String(tutor.price)
    : "";

  async function onCopyProfileLink() {
    const ok = await copyToClipboard(window.location.href);
    toast(ok ? "Profile link copied to clipboard!" : "Copy failed");
  }

  const ratingDisplay = Number.isFinite(Number(tutor.avgRating))
    ? Number(tutor.avgRating).toFixed(1)
    : null;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* Top back link */}
      <Link to={backTo} className="text-sm underline font-medium text-slate-500 hover:text-slate-900 block">
        ← Back to Marketplace
      </Link>

      {/* Trial banner */}
      {showTrialBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="text-emerald-800">
            🎉 <strong>Trial Confirmed!</strong> Your 30-minute session is ready.
          </div>
          <button
            onClick={() => setShowTrialBanner(false)}
            className="ml-auto text-[10px] font-black uppercase border border-emerald-200 px-3 py-1 rounded-xl bg-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Authoritative Credit Badge (italki style) */}
      {tutorCredits > 0 && (
        <div className="p-4 bg-indigo-600 text-white rounded-[32px] flex items-center gap-4 shadow-xl shadow-indigo-100 border-2 border-indigo-400">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black">
            {tutorCredits}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest opacity-80">Pre-paid Balance</div>
            <div className="text-lg font-bold leading-tight">You have {tutorCredits} lessons ready with {tutor.name}</div>
          </div>
          <Link 
            to={`/book/${tutor._id || id}`} 
            className="ml-auto bg-white text-indigo-600 px-4 py-2 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-transform"
          >
            Schedule
          </Link>
        </div>
      )}

      {/* Centered header */}
      <div className="text-center space-y-4 pt-4">
        {tutor.avatar ? (
          <img
            src={tutor.avatar}
            alt="Tutor"
            className="w-48 h-48 object-cover rounded-[40px] mx-auto border-4 border-white shadow-xl"
          />
        ) : (
          <div className="w-48 h-48 rounded-[40px] mx-auto border shadow-sm flex items-center justify-center text-5xl font-black bg-slate-50 text-slate-300">
            {tutor.name?.[0] || "?"}
          </div>
        )}

        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{tutor.name}</h1>
          <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            {tutor.subjects?.length ? tutor.subjects.join(" • ") : "Academic Professional"}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          {ratingDisplay && (
            <div className="flex items-center gap-1 font-black text-slate-900">
              <span className="text-amber-500 text-xl">★</span> {ratingDisplay} <span className="opacity-30 font-bold text-xs uppercase ml-1">/ 5</span>
            </div>
          )}
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="font-black text-slate-900 text-xl">
            {priceValue ? `€${priceValue}` : "—"} <span className="opacity-30 font-bold text-xs uppercase">/ HR</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center flex-wrap gap-3 pt-4">
          <Link
            to={`/book/${tutor._id || id}`}
            state={{
              tutor,
              from: { pathname: loc.pathname, search: loc.search },
            }}
            className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
              tutorCredits > 0 
                ? "bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600" 
                : "bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700"
            }`}
          >
            {tutorCredits > 0 ? "Schedule session" : "Book lesson"}
          </Link>

          <button
            onClick={toggleFavorite}
            className="border-2 border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            {isFav ? "♥ Favourited" : "♡ Save Profile"}
          </button>

          <button
            onClick={onCopyProfileLink}
            className="border-2 border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            Share 🔗
          </button>
        </div>
        
        <div className="flex justify-center pt-2">
           <TrialsBadge tutorId={tutor._id || id} />
        </div>
      </div>

      {/* Bio */}
      {tutor.bio && (
        <div className="p-6 border-2 border-slate-50 rounded-[32px] bg-white shadow-sm text-slate-600 leading-relaxed text-sm">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Biography</h3>
          <div className="whitespace-pre-line">{tutor.bio}</div>
        </div>
      )}

      {/* Visual divider before reviews */}
      <div className="flex items-center gap-4 py-4">
        <div className="h-[2px] flex-1 bg-slate-50"></div>
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Feedback</div>
        <div className="h-[2px] flex-1 bg-slate-50"></div>
      </div>

      {/* Reviews panel */}
      <ReviewsPanel
        tutorId={tutor._id || id}
        tutorName={tutor.name}
      />

      {/* Notebook Footer Branding */}
      <div className="text-center py-10 opacity-20 select-none pointer-events-none">
        <div className="text-3xl font-black tracking-tighter">LERNITT ACADEMY</div>
        <div className="text-[10px] font-bold uppercase tracking-[1em] mt-2">Professional Tutor Edition</div>
      </div>
    </div>
  );
}
