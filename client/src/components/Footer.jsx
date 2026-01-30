// client/src/components/Footer.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Footer({ theme = "light" }) {
  const year = new Date().getFullYear();
  const { isAuthed, user } = useAuth();
  const isTutor = isAuthed && user?.role === "tutor";

  const baseBg =
    theme === "dark"
      ? "bg-slate-950 text-slate-300 border-t border-slate-800"
      : "bg-slate-50 text-slate-700 border-t border-slate-200";

  return (
    <footer className={`${baseBg} mt-16`}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* GRID */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Column 1 — Lernitt */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide">Lernitt</h3>
            <p className="text-xs opacity-70 leading-relaxed">
              Learn languages & skills with friendly tutors in live 1-to-1 lessons.
            </p>

            {/* BUSINESS LOCATION (NEW) */}
            <p className="text-xs opacity-70">
              Business location: <span className="font-semibold">Victoria, Australia</span>
            </p>

            {/* © LINE LINKS TO TERMS (AMENDED) */}
            <p className="text-xs opacity-70 mt-2">
              © {year} Lernitt Pty Ltd.{" "}
              <Link to="/terms" className="underline hover:opacity-80">
                All rights reserved.
              </Link>
            </p>
          </div>

          {/* Column 2 — For Students */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide">For Students</h3>
            <nav className="flex flex-col gap-2 text-xs">
              <Link to="/signup" className="hover:underline">
                Sign up
              </Link>
              <Link to="/tutors" className="hover:underline">
                Find a tutor
              </Link>
              <Link to="/pricing" className="hover:underline">
                Pricing
              </Link>
              <Link to="/contact" className="hover:underline">
                Contact
              </Link>
            </nav>
          </div>

          {/* Column 3 — For Tutors */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide">For Tutors</h3>
            <nav className="flex flex-col gap-2 text-xs">
              <Link to="/signup?type=tutor" className="hover:underline">
                Apply to teach
              </Link>
              <Link to="/tutor" className="hover:underline">
                Tutor dashboard
              </Link>
              {isTutor && (
                <Link to="/availability" className="hover:underline">
                  Manage availability
                </Link>
              )}
              <Link to="/payouts" className="hover:underline">
                Payouts
              </Link>
            </nav>
          </div>

          {/* Column 4 — Legal */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide">Legal</h3>
            <nav className="flex flex-col gap-2 text-xs">
              <Link to="/terms" className="hover:underline">
                Terms & Conditions
              </Link>
              <Link to="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="hover:underline">
                Cookie Policy
              </Link>
              <Link to="/complaints" className="hover:underline">
                Complaints Policy
              </Link>
              <Link to="/age-requirements" className="hover:underline">
                Age Requirements
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
