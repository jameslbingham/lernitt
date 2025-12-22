// client/src/components/Header.jsx
// Desktop header + mobile menu, with tutor Availability BUTTON

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { apiFetch } from "../lib/apiFetch.js";
import { useEffect, useState } from "react";

// Logo file
import logo from "../assets/lernitt-logo.png";

export default function Header() {
  const { isAuthed, user, logout, getToken, authError, clearAuthError } =
    useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const dashboardPath =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "tutor"
      ? "/tutor"
      : "/my-lessons";

  const isTutor = isAuthed && user?.role === "tutor";
  const canBecomeTutor = isAuthed && !isTutor && user?.role !== "admin";

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      {/* Global auth / token-expired banner */}
      {authError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 flex items-center justify-between gap-3">
          <span>
            {authError.message ||
              "Your session has ended. Please log in again."}
          </span>

          <Link
            to="/login"
            onClick={() => clearAuthError()}
            className="inline-flex items-center gap-1 border px-3 py-1 rounded-2xl text-xs font-medium bg-white hover:bg-amber-50 shadow-sm hover:shadow-md"
          >
            Log in again
          </Link>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* LEFT: Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Lernitt logo" className="h-9 w-auto" />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link to="/tutors" className="hover:opacity-75">
            Browse Tutors
          </Link>

          <Link to="/pricing" className="hover:opacity-75">
            Pricing
          </Link>

          {isAuthed && (
            <>
              <Link to="/my-lessons" className="hover:opacity-75">
                My Lessons
              </Link>

              <Link to="/notifications" className="hover:opacity-75">
                Notifications {unread > 0 && `(${unread})`}
              </Link>

              {user?.role === "admin" && (
                <Link to="/admin" className="hover:opacity-75">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* DESKTOP RIGHT */}
        <div className="hidden md:flex items-center gap-3 text-sm font-medium">
          {!isAuthed ? (
            <>
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"
              >
                Sign up
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
              {isTutor && (
                <Link
                  to="/availability"
                  className="rounded-lg border border-indigo-600 px-4 py-2 text-indigo-600 hover:bg-indigo-50 transition"
                >
                  Availability
                </Link>
              )}

              {canBecomeTutor && (
                <Link
                  to="/tutor-profile-setup"
                  className="rounded-lg border px-3 py-2 hover:bg-gray-100 transition"
                >
                  Become a tutor
                </Link>
              )}

              <Link
                to={dashboardPath}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"
              >
                {isTutor ? "Tutor Home" : "Dashboard"}
              </Link>

              <button
                onClick={() => logout()}
                className="rounded-lg px-3 py-2 border hover:bg-gray-50 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="md:hidden flex items-center px-3 py-2 border rounded-lg hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white shadow-inner px-4 py-4 space-y-4 text-sm">
          <Link to="/tutors" className="block hover:opacity-75">
            Browse Tutors
          </Link>

          <Link to="/pricing" className="block hover:opacity-75">
            Pricing
          </Link>

          {isAuthed && (
            <>
              <Link to="/my-lessons" className="block hover:opacity-75">
                My Lessons
              </Link>

              <Link
                to="/notifications"
                className="block hover:opacity-75"
              >
                Notifications {unread > 0 && `(${unread})`}
              </Link>

              {isTutor && (
                <Link
                  to="/availability"
                  className="block rounded-lg border border-indigo-600 px-4 py-2 text-indigo-600 text-center hover:bg-indigo-50 transition"
                >
                  Availability
                </Link>
              )}

              {canBecomeTutor && (
                <Link
                  to="/tutor-profile-setup"
                  className="block rounded-lg border px-4 py-2 text-center hover:bg-gray-50 transition"
                >
                  Become a tutor
                </Link>
              )}
            </>
          )}

          <div className="pt-2 border-t space-y-3">
            {!isAuthed ? (
              <>
                <Link
                  to="/signup"
                  className="block rounded-lg bg-indigo-600 px-4 py-2 text-white text-center hover:bg-indigo-700 transition"
                >
                  Sign up
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
                <Link
                  to={dashboardPath}
                  className="block rounded-lg bg-indigo-600 px-4 py-2 text-white text-center hover:bg-indigo-700 transition"
                >
                  {isTutor ? "Tutor Home" : "Dashboard"}
                </Link>

                <button
                  onClick={() => logout()}
                  className="block w-full rounded-lg border px-3 py-2 text-center hover:bg-gray-50 transition"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* MOBILE LEGAL LINKS (SPACING POLISHED) */}
          <div className="pt-4 border-t space-y-2 text-xs opacity-80">
            <Link to="/legal/terms" className="block hover:underline">
              Terms
            </Link>
            <Link to="/legal/privacy" className="block hover:underline">
              Privacy
            </Link>
            <Link to="/legal/cookies" className="block hover:underline">
              Cookies
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
