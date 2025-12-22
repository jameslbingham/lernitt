// /client/src/pages/WelcomeSetup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

export default function WelcomeSetup() {
  const nav = useNavigate();
  const { user, refreshUser } = useAuth();

  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const name = user?.name || "Student";

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);

    try {
      // MOCK MODE: no backend call
      if (MOCK) {
        nav("/tutors", { replace: true });
        return;
      }

      // REAL MODE — update the student's learning profile
      await apiFetch(`${API}/api/profile/student-setup`, {
        method: "POST",
        body: { language, level, goal },
      });

      // Refresh user data in global context
      await refreshUser();

      // Go to main student area (browse tutors)
      nav("/tutors", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Could not save your details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px" }}>
      {/* Student welcome copy */}
      <div className="mb-4 space-y-2">
        <div className="text-xs text-slate-500">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1 hover:underline"
          >
            ← Back to sign up
          </Link>
        </div>
        <h1 className="text-2xl font-bold">
          Welcome, {name}! 🎉
        </h1>
        <p className="text-sm text-slate-700">
          Let&apos;s set up your <strong>learning profile</strong> so tutors
          know how to help you from the first lesson.
        </p>
        <p className="text-xs text-slate-500">
          This page is for <strong>students</strong> who want to learn. Tutors
          can switch to the teaching setup below.
        </p>
      </div>

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

      <form onSubmit={onSubmit}>
        {/* Language */}
        <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
          What do you want to learn?
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <option value="">Select a language…</option>
            <option value="english">English</option>
            <option value="spanish">Spanish</option>
            <option value="french">French</option>
            <option value="german">German</option>
            <option value="japanese">Japanese</option>
            <option value="korean">Korean</option>
            <option value="chinese">Chinese (Mandarin)</option>
          </select>
        </label>

        {/* Level */}
        <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
          What is your current level?
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <option value="">Select level…</option>
            <option value="beginner">Beginner</option>
            <option value="elementary">Elementary</option>
            <option value="intermediate">Intermediate</option>
            <option value="upper-intermediate">Upper Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        {/* Goal */}
        <label style={{ display: "block", marginBottom: 20, fontSize: 14 }}>
          What is your main goal?
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <option value="">Choose your goal…</option>
            <option value="conversation">Improve speaking &amp; conversation</option>
            <option value="business">Business or professional English</option>
            <option value="exam">Prepare for an exam (IELTS, DELE, etc.)</option>
            <option value="grammar">Improve grammar &amp; writing</option>
            <option value="travel">Learning for travel</option>
            <option value="school-help">School / university help</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "#4f46e5",
            color: "white",
            borderRadius: 10,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          {loading ? "Saving…" : "Continue to tutors"}
        </button>
      </form>

      {/* Tutor CTA card */}
      <div
        style={{
          marginTop: 10,
          padding: 16,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          fontSize: 14,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Want to teach on Lernitt?
        </div>
        <p style={{ marginBottom: 10, opacity: 0.8 }}>
          If you&apos;re here as a <strong>tutor</strong>, you can set up your teaching profile instead.
        </p>
        <button
          type="button"
          onClick={() => nav("/tutor-profile-setup")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #4f46e5",
            background: "white",
            color: "#4f46e5",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Become a tutor
        </button>
      </div>
    </div>
  );
}
