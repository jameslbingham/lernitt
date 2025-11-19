// client/src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

  // NEW: login/signup mode
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
      // ------------------
      // MOCK MODE
      // ------------------
      if (MOCK) {
        const role = email.startsWith("admin")
          ? "admin"
          : email.startsWith("tutor")
          ? "tutor"
          : "student";

        login("mock-token", { email, role });
        return nav(next, { replace: true });
      }

      // ------------------
      // SIGNUP MODE
      // ------------------
      if (mode === "signup") {
        const data = await apiFetch(`${API}/api/auth/signup`, {
          method: "POST",
          body: { email, password },
        });

        if (!data?.token || !data?.user) {
          throw new Error("Signup failed");
        }

        login(data.token, data.user);
        return nav("/", { replace: true });
      }

      // ------------------
      // LOGIN MODE
      // ------------------
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
    <div style={{ maxWidth: 460, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        {mode === "login" ? "Login" : "Create account"}
      </h1>

      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        You’ll return to: <code>{next}</code>
      </div>

      {err && (
        <div
          role="alert"
          style={{
            color: "#b91c1c",
            marginBottom: 8,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: "8px 10px",
            borderRadius: 8,
          }}
        >
          {err}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            inputMode="email"
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginTop: 4,
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!MOCK}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 36px 8px 8px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                marginTop: 4,
              }}
            />

            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                padding: "4px 8px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember email
          </label>

          {/* Toggle mode */}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setErr("");
            }}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#2563eb",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
              fontSize: 14,
            }}
          >
            {mode === "login" ? "Create account" : "Back to login"}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            minWidth: 120,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? mode === "login"
              ? "Signing in…"
              : "Creating…"
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>
      </form>
    </div>
  );
}
