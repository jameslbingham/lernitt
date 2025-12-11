// client/src/components/Footer.jsx
import { Link } from "react-router-dom";

export default function Footer({ theme = "light" }) {
  const year = new Date().getFullYear();
  const baseBg =
    theme === "dark"
      ? "bg-slate-950 text-slate-300 border-t border-slate-800"
      : "bg-slate-50 text-slate-700 border-t border-slate-200";

  return (
    <footer className={`${baseBg} mt-10`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">Lernitt</span>
          <span className="text-xs opacity-70">
            © {year} Lernitt. All rights reserved.
          </span>
        </div>

        <nav className="flex flex-wrap gap-4 text-xs sm:text-sm">
          {/* Primary navigation */}
          <Link to="/about" className="hover:underline">
            About
          </Link>
          <Link to="/tutors" className="hover:underline">
            Tutors
          </Link>
          <Link to="/pricing" className="hover:underline">
            Pricing
          </Link>
          <Link to="/contact" className="hover:underline">
            Contact
          </Link>

          {/* Legal links */}
          <Link to="/terms" className="hover:underline">
            Terms
          </Link>
          <Link to="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link to="/cookies" className="hover:underline">
            Cookies
          </Link>
          <Link to="/complaints" className="hover:underline">
            Complaints
          </Link>
          <Link to="/age-requirements" className="hover:underline">
            Age requirements
          </Link>
        </nav>
      </div>
    </footer>
  );
}
