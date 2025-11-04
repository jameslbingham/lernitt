// client/src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

export default function Login() {
  const nav = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // ignored in mock
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (MOCK) {
        const role = email.startsWith("admin")
          ? "admin"
          : email.startsWith("tutor")
          ? "tutor"
          : "student";
        localStorage.setItem("token", "mock");
        localStorage.setItem("user", JSON.stringify({ role }));
        window.dispatchEvent(new Event("auth-change"));
        return nav(next, { replace: true });
      }
      const data = await apiFetch(`${API}/api/auth/login`, {
        method: "POST",
        body: { email, password },
      });
      if (!data?.token) throw new Error("No token returned");
      localStorage.setItem("token", data.token);
      if (data.user) {
        try {
          localStorage.setItem("user", JSON.stringify(data.user));
        } catch {}
      }
      try {
        window.dispatchEvent(new Event("auth-change"));
      } catch {}
      nav(next, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Login</h1>

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
              border: "1px solid #e57e7eb",
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
              placeholder={MOCK ? "(ignored in mock mode)" : ""}
              autoComplete="current-password"
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
              aria-label={showPw ? "Hide password" : "Show password"}
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
          {MOCK && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Mock mode: password is ignored — you can leave it blank.
            </div>
          )}
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

          <Link to="/profile" className="text-sm underline" style={{ marginLeft: "auto" }}>
            Create account
          </Link>
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {/* Demo buttons (mock mode only) */}
      {import.meta.env.VITE_MOCK === "1" && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => {
              setEmail("student@example.com");
              setPassword("123456");
            }}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            Use demo student
          </button>{" "}
          <button
            type="button"
            onClick={() => {
              setEmail("tutor@example.com");
              setPassword("123456");
            }}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            Use demo tutor
          </button>{" "}
          <button
            type="button"
            onClick={() => {
              setEmail("admin@example.com");
              setPassword("123456");
            }}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            Use demo admin
          </button>
        </div>
      )}

      {MOCK && (
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          MOCK MODE is active. You can sign in with any email; password is ignored.
        </div>
      )}
    </div>
  );
}
