// /client/src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

export default function Signup() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [showPw, setShowPw] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [ackPrivacy, setAckPrivacy] = useState(false);
  const [ackAge, setAckAge] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = agreeTerms && ackPrivacy && ackAge;

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    if (!canSubmit) {
      setErr(
        "Please confirm the Terms, Privacy Policy, and Age Requirements to create an account."
      );
      return;
    }

    setErr("");
    setLoading(true);

    try {
      if (MOCK) {
        // MOCK: keep using the selected role directly
        login("mock-token", { email, role, name });
        nav(role === "tutor" ? "/tutor-profile-setup" : "/welcome-setup", {
          replace: true,
        });
        return;
      }

      // ✅ LIVE: send both role and type for backward-compatibility
      const payload = {
        email,
        password,
        name,
        role,        // new explicit role field
        type: role,  // keep old field name so backend still works
      };

      const data = await apiFetch(`${API}/api/auth/signup`, {
        method: "POST",
        body: payload,
      });

      if (!data?.token || !data?.user) {
        throw new Error("Invalid signup response from server");
      }

      // ✅ Ensure the user object in auth state has the correct role
      const serverUser = data.user || {};
      const effectiveRole = serverUser.role || role; // fall back to selected role

      const mergedUser = {
        ...serverUser,
        role: effectiveRole,
      };

      // useAuth supports login(token, user)
      login(data.token, mergedUser);

      nav(
        effectiveRole === "tutor" ? "/tutor-profile-setup" : "/welcome-setup",
        {
          replace: true,
        }
      );
    } catch (e2) {
      setErr(e2?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-20 space-y-12">
        {/* HERO */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold sm:text-5xl">
            Create Your Lernitt Account
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base opacity-80">
            Join a learning platform built by someone who understands both
            students and tutors — because he’s been both.
          </p>
        </section>

        {/* FOUNDER TRUST BLOCK */}
        <section className="rounded-2xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
            Why Lernitt?
          </h2>
          <p className="text-sm leading-relaxed opacity-90">
            Lernitt was founded by a tutor with over{" "}
            <strong>10 years of online teaching experience</strong>, thousands of
            lessons taught, and real success helping students pass exams and
            land jobs.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            Having also studied languages online and lived as an expat across
            Asia and Europe, Lernitt is designed with empathy for both sides of
            the learning experience.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            That means clearer expectations, fairer systems, and a platform that
            respects your time.
          </p>
        </section>

        {/* SIGNUP CARD */}
        <section className="mx-auto max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 hover:underline"
            >
              ← Back to login
            </Link>
            <Link to="/tutors" className="hover:underline">
              Browse tutors
            </Link>
          </div>

          <h2 className="text-2xl font-bold text-center">Get Started</h2>

          {/* STUDENT / TUTOR BENEFITS */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm space-y-1">
            <p className="font-semibold">For students:</p>
            <p className="opacity-80">
              Find trusted tutors, book easily, and start with free trials.
            </p>
            <p className="font-semibold pt-2">For tutors:</p>
            <p className="opacity-80">
              Keep more of what you earn with lower commission and fair rules.
            </p>
          </div>

          {err && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <p className="font-semibold mb-1">
                We couldn&apos;t create your account.
              </p>
              <p>{err}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* NAME */}
            <label className="block text-sm font-medium">
              Full Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* EMAIL */}
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* PASSWORD */}
            <label className="block text-sm font-medium">
              Password
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!MOCK}
                  placeholder={MOCK ? "(ignored in mock mode)" : ""}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {/* ROLE */}
            <label className="block text-sm font-medium">
              I want to sign up as
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
              </select>
            </label>

            {/* TERMS / PRIVACY / AGE */}
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 h-4 w-4"
                required
              />
              <span>
                I agree to the{" "}
                <Link to="/legal/terms" className="underline font-semibold">
                  Terms
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={ackPrivacy}
                onChange={(e) => setAckPrivacy(e.target.checked)}
                className="mt-1 h-4 w-4"
                required
              />
              <span>
                I have read the{" "}
                <Link to="/legal/privacy" className="underline font-semibold">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={ackAge}
                onChange={(e) => setAckAge(e.target.checked)}
                className="mt-1 h-4 w-4"
                required
              />
              <span>
                I confirm I meet the{" "}
                <Link
                  to="/legal/age-requirements"
                  className="underline font-semibold"
                >
                  Age Requirements
                </Link>
              </span>
            </label>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>

            {/* PRIVACY REASSURANCE */}
            <p className="text-xs text-center opacity-70">
              We respect your privacy. Your details are never sold or shared.
              Read our{" "}
              <Link to="/legal/privacy" className="underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/legal/terms" className="underline">
                Terms
              </Link>
              .
            </p>
          </form>

          {/* LOGIN */}
          <p className="text-center text-sm opacity-80">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold underline">
              Log in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
