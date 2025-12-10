// client/src/components/Header.jsx
// Clean single-row header (Option 1)
// - Shows logo
// - Shows Browse Tutors
// - Shows “Sign up as Student” + “Sign up as Tutor”
// - Shows Login / Logout
// - Shows My Lessons, Favourites, Notifications when logged in
// - Works for admin, tutor, and student roles
// ---------------------------------------------------------------

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { apiFetch } from "../lib/apiFetch.js";
import { useEffect, useState } from "react";

// Logo file
import logo from "../assets/lernitt-logo.png";

export default function Header() {
  const { isAuthed, user, logout, getToken } = useAuth();
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  // Load unread notifications
  useEffect(() => {
    async function loadUnread() {
      const token = getToken();
      if (!token) return setUnread(0);

      try {
        const list = await apiFetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const count = Array.isArray(list)
          ? list.filter((n) => !n.read).length
          : 0;
        setUnread(count);
      } catch {
        setUnread(0);
      }
    }

    loadUnread();
    const id = setInterval(loadUnread, 5000);
    return () => clearInterval(id);
  }, [getToken]);

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        
        {/* LEFT: Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Lernitt logo" className="h-9 w-auto" />
        </Link>

        {/* MIDDLE: Main navigation */}
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link to="/tutors" className="hover:opacity-75">
            Browse Tutors
          </Link>

          {isAuthed && (
            <>
              <Link to="/my-lessons" className="hover:opacity-75">
                My Lessons
              </Link>

              <Link to="/favourites" className="hover:opacity-75">
                Favourites
              </Link>

              <Link to="/notifications" className="hover:opacity-75">
                Notifications {unread > 0 && `(${unread})`}
              </Link>

              {/* Tutor menu */}
              {user?.role === "tutor" && (
                <Link to="/tutor" className="hover:opacity-75">
                  Tutor Dashboard
                </Link>
              )}

              {/* Admin menu */}
              {user?.role === "admin" && (
                <Link to="/admin" className="hover:opacity-75">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* RIGHT SIDE BUTTONS */}
        <div className="flex items-center gap-3 text-sm font-medium">
          {!isAuthed ? (
            <>
              {/* Visitor buttons */}
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"
              >
                Sign up as Student
              </Link>

              <Link
                to="/signup?type=tutor"
                className="rounded-lg border border-indigo-600 px-4 py-2 text-indigo-600 transition hover:bg-indigo-50"
              >
                Sign up as Tutor
              </Link>

              <Link
                to="/login"
                className="rounded-lg px-3 py-2 hover:bg-gray-100 transition"
              >
                Login
              </Link>
            </>
          ) : (
            <>
              {/* Logged-in user */}
              <span className="opacity-70 text-xs">
                {user?.email || "User"}
              </span>

              <button
                onClick={() => logout()}
                className="rounded-lg px-3 py-2 border hover:bg-gray-50 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
