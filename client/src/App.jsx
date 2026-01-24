// client/src/App.jsx
console.log("App.jsx loaded");

import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { useAuth, AuthProvider } from "./hooks/useAuth.jsx";

// GLOBAL HEADER
import Header from "./components/Header.jsx";
// GLOBAL FOOTER
import Footer from "./components/Footer.jsx";

// STATIC IMPORT
import VideoLesson from "./pages/VideoLesson.jsx";

// LAZY IMPORTS -------------------------------------------------------
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
const LessonEnded = lazy(() => import("./pages/LessonEnded.jsx"));
const LessonRecordings = lazy(
  () => import("./pages/LessonRecordings.jsx")
);
const PlacementTest = lazy(() => import("./pages/PlacementTest.jsx")); // ✅ Added PlacementTest

// Signup + setup pages
const Signup = lazy(() => import("./pages/Signup.jsx"));
const WelcomeSetup = lazy(() => import("./pages/WelcomeSetup.jsx"));
const TutorProfileSetup = lazy(
  () => import("./pages/TutorProfileSetup.jsx")
);

// Tutor & student lesson pages (static imports)
import TutorLessons from "./pages/TutorLessons.jsx";
import StudentLessonDetail from "./pages/StudentLessonDetail.jsx";
import BookingConfirmation from "./pages/BookingConfirmation.jsx";
import Settings from "./pages/Settings.jsx";
import TutorDashboard from "./pages/TutorDashboard.jsx";
import StudentReceipt from "./pages/StudentReceipt"; // ✅ NEW: Transaction Receipt

// PUBLIC INFO PAGES
const About = lazy(() => import("./pages/About.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));

// LEGAL PAGES
const Terms = lazy(() => import("./pages/legal/Terms.jsx"));
const Privacy = lazy(() => import("./pages/legal/Privacy.jsx"));
const Cookies = lazy(() => import("./pages/legal/Cookies.jsx"));
const Complaints = lazy(
  () => import("./pages/legal/Complaints.jsx")
);
const AgeRequirements = lazy(
  () => import("./pages/legal/AgeRequirements.jsx")
);

// 404 PAGE
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

// -------------------------------------------------------------------------
// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

// -------------------------------------------------------------------------
// Admin guard
function AdminGuard({ children }) {
  const { token, user } = useAuth();
  const loc = useLocation();

  if (!token) {
    const next = encodeURIComponent(
      `${loc.pathname}${loc.search || ""}`
    );
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

// -------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
          <Suspense
            fallback={<div style={{ padding: 12 }}>Loading…</div>}
          >
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Public info pages */}
              <Route path="/about" element={<About />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/welcome-setup" element={<WelcomeSetup />} />
              <Route
                path="/tutor-profile-setup"
                element={<TutorProfileSetup />}
              />

              {/* Marketplace */}
              <Route path="/tutors" element={<Tutors />} />
              <Route path="/tutors/:id" element={<TutorProfile />} />
              <Route path="/book/:tutorId" element={<BookLesson />} />
              <Route path="/pay/:lessonId" element={<Pay />} />
              <Route
                path="/confirm/:lessonId"
                element={<BookingConfirmation />}
              />
              <Route
                path="/receipt/:lessonId"
                element={<StudentReceipt />}
              /> {/* ✅ NEW: Package Receipt Route */}
              <Route path="/students" element={<Students />} />

              {/* Legal */}
              <Route path="/legal/terms" element={<Terms />} />
              <Route path="/legal/privacy" element={<Privacy />} />
              <Route path="/legal/cookies" element={<Cookies />} />
              <Route
                path="/legal/complaints"
                element={<Complaints />}
              />
              <Route
                path="/legal/age-requirements"
                element={<AgeRequirements />}
              />

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
                <Route
                  path="/tutor-lessons"
                  element={<TutorLessons />}
                />
                <Route
                  path="/student-lesson/:lessonId"
                  element={<StudentLessonDetail />}
                />
                <Route path="/payouts" element={<Payouts />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="/notifications"
                  element={<Notifications />}
                />
                <Route path="/tutor" element={<TutorDashboard />} />

                {/* Video */}
                <Route path="/video" element={<VideoLesson />} />
                <Route path="/lesson-ended" element={<LessonEnded />} />
                <Route
                  path="/lesson-recordings"
                  element={<LessonRecordings />}
                />

                {/* ✅ New: Assessment / Placement Test Route */}
                <Route path="/placement-test" element={<PlacementTest />} />
              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
