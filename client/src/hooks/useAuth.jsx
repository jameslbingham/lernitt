// /client/src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const TOKEN_KEY = "token";
const USER_KEY = "user";

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeToken(t) {
  try {
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function writeUser(u) {
  try {
    u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY);
  } catch {}
}

function emitAuthChange() {
  try {
    document.dispatchEvent(new Event("auth-change"));
  } catch {}
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken());
  const [user, setUser] = useState(readUser());

  // Listen for changes in localStorage (multi-tab support)
  useEffect(() => {
    function sync() {
      setToken(readToken());
      setUser(readUser());
    }
    window.addEventListener("storage", sync);
    document.addEventListener("auth-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      document.removeEventListener("auth-change", sync);
    };
  }, []);

  function login(newToken, newUser) {
    writeToken(newToken);
    writeUser(newUser);
    setToken(newToken);
    setUser(newUser);
    emitAuthChange();
  }

  function logout() {
    writeToken("");
    writeUser(null);
    setToken("");
    setUser(null);
    emitAuthChange();
  }

  const role = user?.role || null;
  const isAuthed = !!token;

  return (
    <AuthContext.Provider value={{ token, user, role, isAuthed, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
