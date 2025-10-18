// /client/src/hooks/useAuth.js
import { useEffect, useState } from "react";

export function readToken() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}
export function readUser() {
  try { const raw = localStorage.getItem("user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeToken(v) { try { v ? localStorage.setItem("token", v) : localStorage.removeItem("token"); } catch {} }
function writeUser(u) { try { u ? localStorage.setItem("user", JSON.stringify(u)) : localStorage.removeItem("user"); } catch {} }
function emitAuthChange() { try { document.dispatchEvent(new Event("auth-change")); } catch {} }

export function useAuth() {
  const [token, setToken] = useState(readToken());
  const [user, setUser] = useState(readUser());

  useEffect(() => {
    function onChange() { setToken(readToken()); setUser(readUser()); }
    document.addEventListener("auth-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      document.removeEventListener("auth-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function getToken() { return readToken(); }
  function login(newToken, newUser) {
    writeToken(newToken); writeUser(newUser);
    setToken(newToken || ""); setUser(newUser || null); emitAuthChange();
  }
  function logout() {
    writeToken(""); writeUser(null);
    setToken(""); setUser(null); emitAuthChange();
  }

  const isAuthed = !!token;
  const loggedIn = isAuthed;

  return { token, user, isAuthed, loggedIn, getToken, login, logout };
}
