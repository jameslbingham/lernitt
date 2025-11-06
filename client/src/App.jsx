// client/src/App.jsx
console.log("App.jsx loaded");

import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import Favourites from "./pages/Favourites.jsx";
import { apiFetch } from "./lib/apiFetch.js";
import { useAuth } from "./hooks/useAuth.jsx";

const Payouts = lazy(() => import("./pages/Payouts.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Tutors = lazy(() => import("./pages/Tutors.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const Students = lazy(() => import("./pages/Students.jsx"));
const TutorProfile = lazy(() => import("./pages/TutorProfile.jsx"));
const BookLesson = lazy(() => import("./pages/BookLesson.jsx"));
const Pay = lazy(() => import("./pages/Pay.jsx"));
const Availability = lazy(() => import("./pages/Availability.jsx"));
const MyLessons = lazy(() => import("./pages/MyLessons.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));

import TutorLessons from "./pages/TutorLessons.jsx";
import StudentLessonDetail from "./pages/StudentLessonDetail.jsx";
import BookingConfirmation from "./pages/BookingConfirmation.jsx";
import Settings from "./pages/Settings.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";

// ------------------ Admin guard (reads from useAuth) ---------------------
function AdminGuard({ children }) {
  const { user } = useAuth();
  if (user?.role === "admin") return children;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
  return null;
}
// -----------------------------------------------------------------------------

function Nav() {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  const { isAuthed, user, logout, getToken } = useAuth();

  async function fetchUnread() {
    const token = getToken();
    if (!token) return setUnread(0);
    try {
      const list = await apiFetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(Array.isArray(list) ? list.filter((n) => !n.read).length : 0);
    } catch {
      setUnread(0);
    }
  }

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 2000);
    const onAuth = () => fetchUnread();
    window.addEventListener("auth-change", onAuth);
    return () => {
      clearInterval(id);
      window.removeEventListener("auth-change", onAuth);
    };
  }, []);

  return (
    <nav style={{ padding: 12 }}>
      <Link to="/">Home</Link> | <Link to="/tutors">Tutors</Link> |{" "}
      <Link to="/favourites">Favourites</Link> |{" "}
      <Link to="/my-lessons">My Lessons</Link> |{" "}
      <Link to="/tutor-lessons">Tutor Lessons</Link> |{" "}
      <Link to="/students">Students</Link> |{" "}
      <Link to="/availability">Availability</Link> |{" "}
      <Link to="/payouts">Payouts</Link> | <Link to="/profile">Profile</Link> |{" "}
      <Link to="/settings">Settings</Link> |{" "}
      <Link to="/notifications">Notifications{unread ? ` (${unread})` : ""}</Link>{" "}
      {user?.role === "admin" && <> | <Link to="/admin">Admin</Link></>}

      {isAuthed ? (
        <>
          {" | "}
          <button type="button" onClick={() => logout()} style={{ cursor: "pointer" }}>
            Logout
          </button>
        </>
      ) : (
        <>
          {" | "}
          <Link to="/login">Login</Link>
        </>
      )}

      {isAuthed && (
        <div style={{ marginTop: 6, fontSize: "0.8rem", opacity: 0.7 }}>
          Logged in as {user?.email || user?.role}
        </div>
      )}
    </nav>
  );
}

export default function App({ mockMode }) {
  console.log("App rendering, mockMode =", mockMode);

  return (
    <BrowserRouter>
      <Nav />

      {import.meta.env.VITE_MOCK === "1" && (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "6px 12px",
            textAlign: "center",
          }}
        >
          ⚠️ MOCK MODE: No real backend. Data is simulated.
        </div>
      )}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
        <Suspense fallback={<div style={{ padding: 12 }}>Loading…</div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/tutors" element={<Tutors />} />
            <Route path="/tutors/:id" element={<TutorProfile />} />
            <Route path="/book/:tutorId" element={<BookLesson />} />
            <Route path="/pay/:lessonId" element={<Pay />} />
            <Route path="/confirm/:lessonId" element={<BookingConfirmation />} />
            <Route path="/students" element={<Students />} />
            <Route path="/favourites" element={<Favourites />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/payouts"
              element={
                <AdminGuard>
                  <AdminDashboard initialTab="payouts" />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/*"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />

            {/* Auth-protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/availability" element={<Availability />} />
              <Route path="/my-lessons" element={<MyLessons />} />
              <Route path="/tutor-lessons" element={<TutorLessons />} />
              <Route path="/student-lesson/:lessonId" element={<StudentLessonDetail />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}
