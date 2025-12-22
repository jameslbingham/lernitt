// client/src/hooks/useAuth.jsx
// Simple auth context for token + user state + global auth error

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

function loadInitialAuth() {
  if (typeof window === "undefined") return { token: null, user: null };

  try {
    // New combined key
    const raw = localStorage.getItem("auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed.token || null,
        user: parsed.user || null,
      };
    }

    // Backwards-compat: separate keys
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;

    return { token: token || null, user: user || null };
  } catch {
    return { token: null, user: null };
  }
}

function persistAuth(token, user) {
  if (typeof window === "undefined") return;
  try {
    if (token && user) {
      const payload = { token, user };
      localStorage.setItem("auth", JSON.stringify(payload));
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setAuth] = useState(() => loadInitialAuth());
  const [initialised, setInitialised] = useState(false);
  const [authError, setAuthError] = useState(null);

  // One-time init (in case localStorage changed before mount)
  useEffect(() => {
    setAuth(loadInitialAuth());
    setInitialised(true);
  }, []);

  // Listen for global auth-error and auth-change events
  useEffect(() => {
    function handleAuthError(evt) {
      const detail = evt?.detail || null;
      setAuthError(
        detail || {
          status: 401,
          code: "UNAUTHORIZED",
          message: "Your session has ended. Please log in again.",
        }
      );
    }

    function handleAuthChange() {
      // after handleUnauthorizedRedirect runs, or manual changes
      setAuth(loadInitialAuth());
      setAuthError(null);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("auth-error", handleAuthError);
      document.addEventListener("auth-change", handleAuthChange);
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("auth-error", handleAuthError);
        document.removeEventListener("auth-change", handleAuthChange);
      }
    };
  }, []);

  function login(authPayload) {
    // expects { token, user } from /api/auth/signup or /api/auth/login
    const nextToken = authPayload?.token || null;
    const nextUser = authPayload?.user || null;
    setAuth({ token: nextToken, user: nextUser });
    persistAuth(nextToken, nextUser);
    setAuthError(null);
  }

  function logout() {
    setAuth({ token: null, user: null });
    persistAuth(null, null);
    setAuthError(null);
  }

  function getToken() {
    return token;
  }

  const value = {
    token,
    user,
    isAuthed: !!token,
    login,
    logout,
    getToken,
    setUser(nextUser) {
      setAuth((prev) => {
        const updated = { ...prev, user: nextUser };
        persistAuth(updated.token, updated.user);
        return updated;
      });
    },
    initialised,
    authError,
    clearAuthError() {
      setAuthError(null);
    },
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
