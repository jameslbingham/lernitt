// /client/src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

/**
 * Wraps all routes that require a logged-in user.
 * If there is no token, redirect to /login?next=<current-path>.
 */
export default function ProtectedRoute() {
  const { token } = useAuth();
  const location = useLocation();

  // Not logged in → send to login with ?next=
  if (!token) {
    const next = encodeURIComponent(
      `${location.pathname}${location.search || ""}`
    );
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Logged in → render nested routes
  return <Outlet />;
}
