// client/src/components/Header.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import logo from "../assets/lernitt-logo.png";

export default function Header() {
  const { isAuthed, logout } = useAuth();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* LEFT SIDE — LOGO */}
      <Link to="/" style={{ display: "flex", alignItems: "center" }}>
        <img
          src={logo}
          alt="Lernitt"
          style={{ height: "38px", objectFit: "contain" }}
        />
      </Link>

      {/* RIGHT SIDE — NAV */}
      <nav style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <Link to="/tutors">Tutors</Link>

        {!isAuthed && (
          <>
            <Link to="/login">Login</Link>
            <Link
              to="/signup"
              style={{ fontWeight: "bold", color: "#2563eb" }}
            >
              Sign up as student
            </Link>
            <Link
              to="/signup?type=tutor"
              style={{
                fontWeight: "bold",
                background: "#2563eb",
                color: "white",
                padding: "6px 12px",
                borderRadius: "6px",
              }}
            >
              Sign up as tutor
            </Link>
          </>
        )}

        {isAuthed && (
          <>
            <Link to="/profile">Profile</Link>
            <Link to="/settings">Settings</Link>
            <button
              onClick={logout}
              style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                color: "#dc2626",
              }}
            >
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
