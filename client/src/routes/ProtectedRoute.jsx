import { Navigate, Outlet, useLocation } from "react-router-dom";

const BYPASS = import.meta.env.VITE_AUTH_BYPASS === "1";

export default function ProtectedRoute({ role }) {
  const loc = useLocation();

  if (BYPASS) return <Outlet />;

  const token = localStorage.getItem("token");
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch {}

  if (!token)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}
        replace
      />
    );

  if (role && (!user || user.role !== role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
