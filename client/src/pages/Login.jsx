// client/src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // login / signup mode (unchanged)
  const [mode, setMode] = useState("login"); // "login" | "signup"

  useEffect(() => {
    try {
      const saved = localStorage.getItem("login:email");
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (remember && email) localStorage.setItem("login:email", email);
      if (!remember) localStorage.removeItem("login:email");
    } catch {}
  }, [email, remember]);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);

    try {
      // MOCK MODE
      if (MOCK) {
        const role = email.startsWith("admin")
          ? "admin"
          : email.startsWith("tutor")
          ? "tutor"
          : "student";

        login("mock-token", { email, role });
        return nav(next, { replace: true });
      }

      // SIGNUP MODE
      if (mode === "signup") {
        const data = await apiFetch(`${API}/api/auth/signup`, {
          method: "POST",
          body: {
            email,
            password,
            name: email.split("@")[0] || "User",
            role: "student",
          },
        });

        if (!data?.token || !data?.user) {
          throw new Error("Signup failed");
        }

        login(data.token, data.user);
        return nav("/", { replace: true });
      }

      // LOGIN MODE
      const data = await apiFetch(`${API}/api/auth/login`, {
        method: "POST",
        body: { email, password },
      });

      if (!data?.token || !data?.user) {
        throw new Error("Login failed");
      }

      login(data.token, data.user);
      nav(next, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-md px-4 pt-20 pb-20 space-y-8">
        {/* HERO */}
        <section className="text-center space-y-3">
          <h1 className="text-3xl font-extrabold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm opacity-80">
            Secure access to your Lernitt account.
          </p>
        </section>

        {/* LOGIN CARD */}
        <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
          <div className="text-xs opacity-70">
            You’ll return to: <code>{next}</code>
          </div>

          {err && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
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
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
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

            {/* REMEMBER + MODE TOGGLE */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember email
              </label>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setErr("");
                }}
                className="ml-auto text-indigo-600 underline"
              >
                {mode === "login" ? "Create account" : "Back to login"}
              </button>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>

            {/* TRUST MICROCOPY */}
            <p className="text-xs text-center opacity-70">
              Secure login. No spam. Your details are protected under our{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
