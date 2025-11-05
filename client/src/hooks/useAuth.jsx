import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { safeFetchJSON } from "@/api/safeFetch";

const AuthContext = createContext(null);
const TOKEN_KEY = "authToken";
const API = import.meta.env.VITE_API;

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json) || {};
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [claims, setClaims] = useState({});
  const [loading, setLoading] = useState(true);

  // Load persisted token on mount
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      setToken(t);
      setClaims(decodeJwt(t));
    }
    setLoading(false);
  }, []);

  const role = claims?.role || claims?.user?.role || null;
  const user = claims?.user || null;

  async function login({ email, password }) {
    const res = await safeFetchJSON(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res?.token) throw new Error("Login failed: missing token");
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setClaims(decodeJwt(res.token));
    return true;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setClaims({});
  }

  // Optional: refresh profile/token rotation
  async function refresh() {
    if (!token) return;
    try {
      const me = await safeFetchJSON(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (me?.token && me.token !== token) {
        localStorage.setItem(TOKEN_KEY, me.token);
        setToken(me.token);
        setClaims(decodeJwt(me.token));
      }
    } catch {
      /* no-op */
    }
  }

  const value = useMemo(
    () => ({ token, user, role, loading, login, logout, refresh }),
    [token, user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
