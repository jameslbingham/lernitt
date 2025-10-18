// client/src/components/ReviewForm.jsx
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiFetch.js";
import { postReview } from "../api/reviews"; // legacy (lessonId path)

/**
 * Props:
 * - tutorId, tutorName (preferred, posts to /api/reviews)
 * - lessonId           (legacy; uses postReview(lessonId, rating, text))
 * - open               (if false, renders nothing)
 * - onClose            (optional)
 * - onSaved / onDone   (optional) — called after submit
 */
export default function ReviewForm({
  tutorId,
  tutorName = "Tutor",
  lessonId,
  open = true,
  onClose,
  onSaved,
  onDone,
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Optional server-side gate (mock + real)
  const [canReview, setCanReview] = useState(true);
  useEffect(() => {
    let alive = true;
    async function check() {
      if (!tutorId) return; // skip when only lessonId path is used
      setError("");
      try {
        const res = await apiFetch(
          `/api/reviews/can-review?tutorId=${encodeURIComponent(tutorId)}`,
          { auth: true }
        );
        if (alive) setCanReview(!!res?.canReview);
      } catch {
        if (alive) setCanReview(false);
      }
    }
    check();
    return () => {
      alive = false;
    };
  }, [tutorId]);

  if (!open) return null;

  // a11y: focus first radio on mount
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // Arrow key support for rating
  function onRatingKeyDown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    setRating((r) => Math.min(5, Math.max(1, Number(r) + dir)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const r = Number(rating);
      const t = String(text || "").trim();
      if (!(r >= 1 && r <= 5)) throw new Error("Pick a rating 1–5.");
      if (t.length < 3) throw new Error("Review is too short.");

      let data = null;

      if (tutorId) {
        // Preferred API path
        data = await apiFetch("/api/reviews", {
          method: "POST",
          auth: true,
          body: { tutorId, rating: r, text: t },
        });
      } else if (lessonId) {
        // Legacy helper path
        await postReview(lessonId, r, t);
      } else {
        throw new Error("Missing tutorId or lessonId.");
      }

      // Success → reset + notify
      setText("");
      setRating(5);
      onSaved?.(data);
      onDone?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Could not save review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {/* Context header */}
      {tutorId && (
        <div className="text-sm opacity-70">
          Reviewing: <b>{tutorName}</b>
        </div>
      )}

      {/* Accessible rating: 1–5 radio group */}
      <fieldset
        className="flex items-center gap-2"
        role="radiogroup"
        aria-label="Rating from 1 to 5 stars"
        onKeyDown={onRatingKeyDown}
      >
        {[1, 2, 3, 4, 5].map((v, i) => (
          <label
            key={v}
            className={`cursor-pointer select-none flex items-center justify-center w-10 h-10 rounded-xl border ${
              Number(rating) === v ? "bg-yellow-100 border-yellow-400" : "bg-white"
            }`}
            title={`${v} star${v === 1 ? "" : "s"}`}
          >
            <input
              type="radio"
              name="rating"
              value={v}
              checked={Number(rating) === v}
              onChange={() => setRating(v)}
              disabled={saving}
              className="sr-only"
              ref={(el) => {
                if (ready && i === 0 && el) el.focus();
              }}
            />
            <span aria-hidden>★{v}</span>
          </label>
        ))}
      </fieldset>
      <div className="text-xs opacity-70">Use Left/Right arrows to adjust.</div>

      {/* Review text */}
      <label className="grid gap-1">
        <span className="text-sm">Your review</span>
        <textarea
          className="border p-2 rounded-xl"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What was good? What could improve?"
          maxLength={600}
          disabled={saving}
        />
        <span className="text-xs opacity-70">{text.length}/600</span>
      </label>

      {/* Gate notice */}
      {!canReview && tutorId && (
        <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2 text-sm">
          You can’t review this tutor right now.
        </div>
      )}

      {/* Error */}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || (tutorId && !canReview) || !text.trim()}
          className="border px-4 py-2 rounded-2xl shadow-sm hover:shadow-md transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Submit review"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-sm underline"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
