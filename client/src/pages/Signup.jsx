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
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);

    try {
      // MOCK MODE
      if (MOCK) {
        login("mock-token", { email, role, name });
        if (role === "tutor") {
          nav("/tutor-profile-setup", { replace: true });
        } else {
          nav("/welcome-setup", { replace: true });
        }
        return;
      }

      // REAL SIGNUP
      const data = await apiFetch(`${API}/api/auth/signup`, {
        method: "POST",
        body: { email, password, name, role },
      });

      if (!data?.token || !data?.user) {
        throw new Error("Invalid signup response from server");
      }

      login(data.token, data.user);

      if (role === "tutor") {
        nav("/tutor-profile-setup", { replace: true });
      } else {
        nav("/welcome-setup", { replace: true });
      }
    } catch (e2) {
      setErr(e2?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-4 py-10">
      <div className="max-w-5xl mx-auto">

        {/* ================================
            HEADER
        ================================= */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-3">Create Your Account</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Join a learning community built for real progress — whether you're a student or a tutor.
          </p>
        </div>

        {/* ================================
            BIG ROLE CARDS
        ================================= */}
        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {/* STUDENT CARD */}
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`rounded-2xl border p-6 text-left shadow-sm transition 
              ${role === "student"
                ? "border-blue-600 ring-2 ring-blue-400 bg-blue-50"
                : "border-slate-300 bg-white dark:bg-slate-900"
              }`}
          >
            <h3 className="text-xl font-bold mb-2">I'm a Student</h3>
            <p className="text-sm opacity-80 mb-3">
              Find the perfect tutor at your price level. No subscriptions, no lock-ins.
            </p>
            <ul className="text-sm list-disc pl-4 space-y-1 opacity-80">
              <li>3 free trial lessons</li>
              <li>Choose tutors across all price points</li>
              <li>Transparent pricing per lesson</li>
              <li>Learn flexibly, on your schedule</li>
            </ul>
          </button>

          {/* TUTOR CARD */}
          <button
            type="button"
            onClick={() => setRole("tutor")}
            className={`rounded-2xl border p-6 text-left shadow-sm transition 
              ${role === "tutor"
                ? "border-green-600 ring-2 ring-green-400 bg-green-50"
                : "border-slate-300 bg-white dark:bg-slate-900"
              }`}
          >
            <h3 className="text-xl font-bold mb-2">I'm a Tutor</h3>
            <p className="text-sm opacity-80 mb-3">
              Earn more teaching online with a platform built by a real tutor.
            </p>
            <ul className="text-sm list-disc pl-4 space-y-1 opacity-80">
              <li>Only 15% commission — you keep 85%</li>
              <li>Set your own hourly rate</li>
              <li>No joining or subscription fees</li>
              <li>Scheduling, messaging & payout tools included</li>
            </ul>
          </button>
        </div>

        {/* ================================
            ERROR BANNER
        ================================= */}
        {err && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-300 bg-red-50 text-red-700 p-3 text-sm"
          >
            {err}
          </div>
        )}

        {/* ================================
            SIGNUP FORM
        ================================= */}
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-6">

            {/* NAME */}
            <div>
              <label className="block mb-1 text-sm font-medium">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block mb-1 text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block mb-1 text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required={!MOCK}
                  placeholder={MOCK ? "(ignored in mock mode)" : ""}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs border border-slate-300 dark:border-slate-600 px-2 py-1 rounded-md bg-white dark:bg-slate-800"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* HIDDEN ROLE FIELD */}
            <input type="hidden" value={role} readOnly />

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition 
                ${role === "tutor" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                ${loading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {loading ? "Creating…" : `Sign up as ${role}`}
            </button>
          </form>

          {/* LOGIN LINK */}
          <div className="text-center mt-4 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
