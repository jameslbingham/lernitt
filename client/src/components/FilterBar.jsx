// client/src/components/FilterBar.jsx
// Frontend-only filter bar with URL sync, localStorage persistence,
// shareable links, and a global event for pages to react without props.
//
// Usage in Tutors.jsx:
//   import FilterBar, { readTutorFilters } from "../components/FilterBar.jsx";
//   <FilterBar />
//   const { subject, minRating, maxPrice } = readTutorFilters();

import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

// Helper: read filters from current URL (or a given search string)
export function readTutorFilters(search = null) {
  const sp =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : new URLSearchParams(window.location.search);

  const subject = sp.get("subject")?.trim() || "";
  const minRating = sp.get("minRating")?.trim() || "";
  const maxPrice = sp.get("maxPrice")?.trim() || "";

  return { subject, minRating, maxPrice };
}

// Helper: clamp / sanitize values
function sanitize({ subject, minRating, maxPrice }) {
  const out = {
    subject: (subject || "").slice(0, 60),
    minRating: minRating ? String(Math.max(0, Math.min(5, Number(minRating)))) : "",
    maxPrice: maxPrice ? String(Math.max(1, Math.floor(Number(maxPrice)))) : "",
  };
  if (out.minRating === "0") out.minRating = "";
  if (out.maxPrice === "0") out.maxPrice = "";
  return out;
}

export default function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Initialize from URL OR localStorage fallback
  const saved =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("tutorFilters") || "{}")
      : {};

  const init = sanitize({
    ...saved,
    ...readTutorFilters(searchParams.toString()),
  });

  const [subject, setSubject] = useState(init.subject || "");
  const [minRating, setMinRating] = useState(init.minRating || "");
  const [maxPrice, setMaxPrice] = useState(init.maxPrice || "");
  const [copied, setCopied] = useState(false);

  // Compose human summary
  const summary = useMemo(() => {
    const parts = [];
    if (subject) parts.push(`Subject: ${subject}`);
    if (minRating) parts.push(`Min ⭐ ${minRating}`);
    if (maxPrice) parts.push(`≤ €${maxPrice}`);
    return parts.join(" • ") || "All tutors";
  }, [subject, minRating, maxPrice]);

  // Build URLSearchParams for current state
  const buildParams = () => {
    const sp = new URLSearchParams(searchParams);
    subject ? sp.set("subject", subject) : sp.delete("subject");
    minRating ? sp.set("minRating", minRating) : sp.delete("minRating");
    maxPrice ? sp.set("maxPrice", maxPrice) : sp.delete("maxPrice");
    return sp;
  };

  // Persist to URL + localStorage + emit a global event
  useEffect(() => {
    const clean = sanitize({ subject, minRating, maxPrice });

    // Update URL (no history spam)
    const next = buildParams();
    setSearchParams(next, { replace: true });

    // Save locally
    localStorage.setItem("tutorFilters", JSON.stringify(clean));

    // Emit event so pages can react without props drilling
    window.dispatchEvent(
      new CustomEvent("tutorFiltersChanged", { detail: clean })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, minRating, maxPrice]);

  // If the URL changes externally (e.g., nav/back), sync inputs
  useEffect(() => {
    const u = readTutorFilters(location.search);
    setSubject(u.subject);
    setMinRating(u.minRating);
    setMaxPrice(u.maxPrice);
  }, [location.search]);

  async function copyLink() {
    const url = `${window.location.pathname}?${buildParams().toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  function clearAll() {
    setSubject("");
    setMinRating("");
    setMaxPrice("");
  }

  // Basic subject suggestions (client-side only)
  const subjectHints = [
    "English",
    "IELTS",
    "Business English",
    "Spanish",
    "French",
    "German",
    "Math",
  ];

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-2xl shadow-sm mb-4">
      <div className="text-sm opacity-70">{summary}</div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <input
            className="border rounded-xl p-2"
            list="subject-hints"
            placeholder="Subject (e.g., English)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <datalist id="subject-hints">
            {subjectHints.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <select
          className="border rounded-xl p-2"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
        >
          <option value="">Min rating</option>
          <option value="5">5</option>
          <option value="4.5">4.5</option>
          <option value="4">4</option>
          <option value="3.5">3.5</option>
          <option value="3">3</option>
        </select>

        <input
          className="border rounded-xl p-2"
          type="number"
          min="1"
          step="1"
          placeholder="Max € price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />

        <div className="flex gap-2 items-stretch">
          <button
            className="px-4 py-2 rounded-xl border shadow-sm"
            onClick={clearAll}
            type="button"
            aria-label="Clear all filters"
          >
            Clear
          </button>
          <button
            className="px-4 py-2 rounded-xl border shadow-sm"
            onClick={copyLink}
            type="button"
            aria-label="Copy link with filters"
            title="Copy link"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
