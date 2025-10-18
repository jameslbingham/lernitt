// client/src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

const MOCK = import.meta.env.VITE_MOCK === "1";

export default function ProtectedRoute({ children }) {
  // In mock mode, allow all routes without a token
  if (MOCK) return children;

  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
