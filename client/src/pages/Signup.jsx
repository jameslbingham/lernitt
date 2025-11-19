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
  const [role, setRole] = useState("student"); // default
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
        if (role === "tutor") nav("/tutor-profile", { replace: true });
        else nav("/welcome-setup", { replace: true });
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

      // Store token + user
      login(data.token, data.user);

      // Redirect based on role
      if (role === "tutor") {
        nav("/tutor-profile", { replace: true });
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
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
        Create Account
      </h1>

      {err && (
        <div
          role="alert"
          style={{
            color: "#b91c1c",
            marginBottom: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          {err}
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* NAME */}
        <label style={{ display: "block", marginBottom: 12 }}>
          Full Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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

        {/* EMAIL */}
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
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

        {/* PASSWORD */}
        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!MOCK}
              placeholder={MOCK ? "(ignored in mock mode)" : ""}
              autoComplete="new-password"
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
                background: "white",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {/* ROLE SELECTOR */}
        <label style={{ display: "block", marginBottom: 20 }}>
          I want to sign up as:
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginTop: 6,
            }}
          >
            <option value="student">Student</option>
            <option value="tutor">Tutor</option>
          </select>
        </label>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            minWidth: 140,
            cursor: loading ? "not-allowed" : "pointer",
            background: "#4f46e5",
            color: "white",
          }}
        >
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>

      {/* Login link */}
      <div style={{ marginTop: 16 }}>
        Already have an account?{" "}
        <Link to="/login" style={{ textDecoration: "underline" }}>
          Log in
        </Link>
      </div>
    </div>
  );
}
