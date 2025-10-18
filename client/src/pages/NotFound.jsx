// client/src/pages/NotFound.jsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="opacity-80">The page you’re looking for doesn’t exist.</p>
      <div className="flex gap-2">
        <Link to="/tutors" className="border px-4 py-2 rounded-2xl shadow-sm hover:shadow-md">
          Browse Tutors
        </Link>
        <Link to="/" className="border px-4 py-2 rounded-2xl hover:bg-gray-50">
          Home
        </Link>
      </div>
    </div>
  );
}
