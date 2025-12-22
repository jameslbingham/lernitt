// /client/src/pages/TutorProfileSetup.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

export default function TutorProfileSetup() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const name = user?.name || "Tutor";

  // Guard: only tutors should access this page
  useEffect(() => {
    if (!user) return;
    if (user.role !== "tutor") {
      nav("/", { replace: true });
    }
  }, [user, nav]);

  // Try to load existing profile (safe if backend not ready)
  useEffect(() => {
    if (MOCK) return;

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch(`${API}/api/profile/tutor`, {
          method: "GET",
        });

        if (!data || cancelled) return;

        if (data.displayName) setDisplayName(data.displayName);
        if (data.headline) setHeadline(data.headline);
        if (data.bio) setBio(data.bio);
        if (data.languages) setLanguages(data.languages);
        if (data.hourlyRate != null) setHourlyRate(String(data.hourlyRate));
      } catch (e) {
        console.warn(
          "Tutor profile load failed (ok if not implemented yet):",
          e
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [API]);

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setErr("");
    setInfo("");
    setSaving(true);

    try {
      if (MOCK) {
        setInfo("Profile saved (mock mode).");
        return;
      }

      const payload = {
        displayName,
        headline,
        bio,
        languages,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      };

      await apiFetch(`${API}/api/profile/tutor`, {
        method: "PUT",
        body: payload,
      });

      setInfo("Your tutor profile has been saved.");
      // Optional: go to tutor dashboard after save
      // nav("/tutor", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-500">
            <Link
              to="/tutor"
              className="inline-flex items-center gap-1 hover:underline"
            >
              ← Back to tutor dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Tutor profile setup</h1>
          <p className="text-sm text-slate-600">
            Add your public details, headline, languages, and bio so students
            know who you are before booking.
          </p>
        </div>

        <Link
          to="/availability"
          className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md"
        >
          Next: set availability
        </Link>
      </div>

      {loading && (
        <div style={{ marginBottom: 10, fontSize: 14, opacity: 0.7 }}>
          Loading your profile…
        </div>
      )}

      {err && (
        <div
          role="alert"
          style={{
            color: "#b91c1c",
            marginBottom: 12,
            padding: "8px 12px",
            background: "#fef2f2",
            borderRadius: 8,
            border: "1px solid #fecaca",
          }}
        >
          {err}
        </div>
      )}

      {info && (
        <div
          style={{
            color: "#166534",
            marginBottom: 12,
            padding: "8px 12px",
            background: "#ecfdf3",
            borderRadius: 8,
            border: "1px solid #bbf7d0",
          }}
        >
          {info}
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* Display Name */}
        <label style={{ display: "block", marginBottom: 14 }}>
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="Your public name (e.g. James B.)"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        </label>

        {/* Headline */}
        <label style={{ display: "block", marginBottom: 14 }}>
          Headline
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Friendly English tutor with 10 years experience"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        </label>

        {/* Languages */}
        <label style={{ display: "block", marginBottom: 14 }}>
          Languages / subjects you teach
          <input
            type="text"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="e.g. English (C2), Spanish (B2)"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        </label>

        {/* Hourly rate */}
        <label style={{ display: "block", marginBottom: 14 }}>
          Hourly rate (USD)
          <input
            type="number"
            min="0"
            step="1"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="e.g. 20"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        </label>

        {/* Bio */}
        <label style={{ display: "block", marginBottom: 16 }}>
          About you and your lessons
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={6}
            placeholder="Introduce yourself, your teaching style, qualifications, and what students can expect."
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              resize: "vertical",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#4f46e5",
            color: "white",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            minWidth: 140,
          }}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>

        <button
          type="button"
          onClick={() => nav("/tutor")}
          style={{
            marginLeft: 10,
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            color: "#374151",
            cursor: "pointer",
            minWidth: 140,
          }}
        >
          Go to dashboard
        </button>
      </form>
    </div>
  );
}
