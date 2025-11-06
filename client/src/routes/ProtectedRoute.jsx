// client/src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function ProtectedRoute({ role }) {
  const { token, user } = useAuth();
  const loc = useLocation();

  // ❌ No token → force login
  if (!token) {
    const next = encodeURIComponent(`${loc.pathname}${loc.search || ""}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // 🔒 If route requires a role, check it
  if (role && (!user || user.role !== role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ Authenticated → allow access
  return <Outlet />;
}
