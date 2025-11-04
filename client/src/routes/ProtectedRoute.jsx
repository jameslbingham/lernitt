// client/src/routes/ProtectedRoute.jsx
// ✅ SAFE VERSION (LOCK)
// Bypass works ONLY in local development, NEVER in production.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

// 🔒 Bypass allowed ONLY when running locally (`import.meta.env.DEV`)
const BYPASS =
  import.meta.env.DEV &&
  (import.meta.env.VITE_AUTH_BYPASS === "1" ||
   import.meta.env.VITE_BYPASS === "1");

export default function ProtectedRoute({ role }) {
  const { isAuthed, user: hookUser } = useAuth();
  const loc = useLocation();

  // ✅ Local-dev bypass (no login needed on your computer)
  if (BYPASS) return <Outlet />;

  // --- Normal protected mode (live site) ---
  let user = hookUser;
  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      user = null;
    }
  }

  if (!isAuthed) {
    const next = encodeURIComponent(`${loc.pathname}${loc.search || ""}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (role && (!user || user.role !== role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
