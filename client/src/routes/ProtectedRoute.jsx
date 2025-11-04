// client/src/routes/ProtectedRoute.jsx
// Allows bypass mode when VITE_AUTH_BYPASS=1 or VITE_BYPASS=1

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const BYPASS =
  import.meta.env.VITE_AUTH_BYPASS === "1" ||
  import.meta.env.VITE_BYPASS === "1";

export default function ProtectedRoute({ role }) {
  const { isAuthed, user: hookUser } = useAuth();
  const loc = useLocation();

  // ✅ Bypass mode: no login checks at all
  if (BYPASS) return <Outlet />;

  // Get user from hook or from localStorage
  let user = hookUser;
  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      user = null;
    }
  }

  // Not logged in → redirect to login
  if (!isAuthed) {
    const next = encodeURIComponent(`${loc.pathname}${loc.search || ""}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Logged in but wrong role → block page
  if (role && (!user || user.role !== role)) return <Navigate to="/" replace />;

  // ✅ All good → allow page
  return <Outlet />;
}
