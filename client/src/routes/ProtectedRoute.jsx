// /client/src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute() {
  const { isAuthed } = useAuth();
  const loc = useLocation();

  if (!isAuthed) {
    const next = encodeURIComponent(`${loc.pathname}${loc.search || ""}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
