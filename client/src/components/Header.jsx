// client/src/components/Header.jsx
// Desktop header unchanged + new mobile hamburger menu (Option B-2)

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { apiFetch } from "../lib/apiFetch.js";
import { useEffect, useState } from "react";

// Logo file
import logo from "../assets/lernitt-logo.png";

export default function Header() {
  const { isAuthed, user, logout, getToken } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false); // NEW: mobile menu toggle
  const navigate = useNavigate();

  // Load unread notifications (unchanged)
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

        {/* DESKTOP NAV — visible on medium screens and up */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
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

              {/* Tutor Dashboard */}
              {user?.role === "tutor" && (
                <Link to="/tutor" className="hover:opacity-75">
                  Tutor Dashboard
                </Link>
              )}

              {/* Admin */}
              {user?.role === "admin" && (
                <Link to="/admin" className="hover:opacity-75">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* DESKTOP RIGHT BUTTONS */}
        <div className="hidden md:flex items-center gap-3 text-sm font-medium">
          {!isAuthed ? (
            <>
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

        {/* MOBILE MENU BUTTON — visible on small screens */}
        <button
          className="md:hidden flex items-center px-3 py-2 border rounded-lg hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* MOBILE DROPDOWN MENU (when hamburger is open) */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white shadow-inner px-4 py-3 space-y-3 text-sm">
          <Link to="/tutors" className="block hover:opacity-75">
            Browse Tutors
          </Link>

          {isAuthed && (
            <>
              <Link to="/my-lessons" className="block hover:opacity-75">
                My Lessons
              </Link>

              <Link to="/favourites" className="block hover:opacity-75">
                Favourites
              </Link>

              <Link to="/notifications" className="block hover:opacity-75">
                Notifications {unread > 0 && `(${unread})`}
              </Link>

              {user?.role === "tutor" && (
                <Link to="/tutor" className="block hover:opacity-75">
                  Tutor Dashboard
                </Link>
              )}

              {user?.role === "admin" && (
                <Link to="/admin" className="block hover:opacity-75">
                  Admin
                </Link>
              )}
            </>
          )}

          {!isAuthed ? (
            <>
              <Link
                to="/signup"
                className="block rounded-lg bg-indigo-600 px-4 py-2 text-white text-center hover:bg-indigo-700 transition"
              >
                Sign up as Student
              </Link>

              <Link
                to="/signup?type=tutor"
                className="block rounded-lg border border-indigo-600 px-4 py-2 text-indigo-600 text-center hover:bg-indigo-50 transition"
              >
                Sign up as Tutor
              </Link>

              <Link
                to="/login"
                className="block rounded-lg px-3 py-2 text-center hover:bg-gray-100 transition"
              >
                Login
              </Link>
            </>
          ) : (
            <>
              <span className="block opacity-70 text-xs px-1">
                {user?.email}
              </span>

              <button
                onClick={() => logout()}
                className="block w-full rounded-lg border px-3 py-2 text-center hover:bg-gray-50 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
