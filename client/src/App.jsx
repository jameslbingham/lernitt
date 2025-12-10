// client/src/App.jsx
console.log("App.jsx loaded");

import { useEffect, useState, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { apiFetch } from "./lib/apiFetch.js";
import { useAuth } from "./hooks/useAuth.jsx";

// NEW: Global header
import Header from "./components/Header.jsx";

// NEW (static import)
import VideoLesson from "./pages/VideoLesson.jsx";

// ---- Lazy imports -------------------------------------------------------
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

// NEW — lazy import LessonEnded
const LessonEnded = lazy(() => import("./pages/LessonEnded.jsx"));
// NEW — lazy import LessonRecordings
const LessonRecordings = lazy(() => import("./pages/LessonRecordings.jsx"));

// NEW — signup + setup pages
const Signup = lazy(() => import("./pages/Signup.jsx"));
const WelcomeSetup = lazy(() => import("./pages/WelcomeSetup.jsx"));
const TutorProfileSetup = lazy(() => import("./pages/TutorProfileSetup.jsx"));

import TutorLessons from "./pages/TutorLessons.jsx";
import StudentLessonDetail from "./pages/StudentLessonDetail.jsx";
import BookingConfirmation from "./pages/BookingConfirmation.jsx";
import Settings from "./pages/Settings.jsx";
import TutorDashboard from "./pages/TutorDashboard";

const API = import.meta.env.VITE_API || "http://localhost:5000";

// ---- Admin Guard --------------------------------------------------------
function AdminGuard({ children }) {
  const { token, user } = useAuth();

  const loc = useLocation();
  if (!token) {
    const next = encodeURIComponent(`${loc.pathname}${loc.search || ""}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
// -------------------------------------------------------------------------

export default function App({ mockMode }) {
  console.log("App rendering, mockMode =", mockMode);

  return (
    <BrowserRouter>
      {/* NEW: global header always visible */}
      <Header />

      {/* REMOVED: mock mode banner (you requested clean layout) */}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
        <Suspense fallback={<div style={{ padding: 12 }}>Loading…</div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Signup + onboarding */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/welcome-setup" element={<WelcomeSetup />} />
            <Route path="/tutor-profile-setup" element={<TutorProfileSetup />} />

            {/* Main marketplace routes */}
            <Route path="/tutors" element={<Tutors />} />
            <Route path="/tutors/:id" element={<TutorProfile />} />
            <Route path="/book/:tutorId" element={<BookLesson />} />
            <Route path="/pay/:lessonId" element={<Pay />} />
            <Route path="/confirm/:lessonId" element={<BookingConfirmation />} />
            <Route path="/students" element={<Students />} />
            <Route path="/favourites" element={<Favourites />} />

            {/* Admin */}
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
              <Route
                path="/student-lesson/:lessonId"
                element={<StudentLessonDetail />}
              />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/tutor" element={<TutorDashboard />} />

              {/* Video lessons */}
              <Route path="/video" element={<VideoLesson />} />
              <Route path="/lesson-ended" element={<LessonEnded />} />
              <Route path="/lesson-recordings" element={<LessonRecordings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}
