// /client/src/pages/WelcomeSetup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
        return nav("/browse", { replace: true });
      }

      // REAL MODE — update the user's onboarding data
      await apiFetch(`${API}/api/profile/student-setup`, {
        method: "POST",
        body: { language, level, goal },
      });

      // Refresh user data in global context
      await refreshUser();

      // Go to main student area
      nav("/browse", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Could not save your details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
        Welcome, {name}! 🎉
      </h1>
      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        Let's set up your learning profile.
      </p>

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
        <label style={{ display: "block", marginBottom: 16 }}>
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
        <label style={{ display: "block", marginBottom: 16 }}>
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
        <label style={{ display: "block", marginBottom: 20 }}>
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
            <option value="conversation">Improve speaking & conversation</option>
            <option value="business">Business or professional English</option>
            <option value="exam">Prepare for an exam (IELTS, DELE, etc.)</option>
            <option value="grammar">Improve grammar & writing</option>
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
          }}
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
