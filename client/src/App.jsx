// client/src/App.jsx
/**
 * LERNITT ACADEMY - MAIN APPLICATION ENTRY & ROUTING MAPPED
 * ----------------------------------------------------------------------------
 * VERSION: 4.1.2
 * FEATURES: 
 * - Lazy-loaded views for optimized performance
 * - Multi-tiered authentication (Admin, Tutor, Student)
 * - CEFR Assessment & Placement Logic
 * - italki-style Transaction & Receipting system
 * - NEW: Secure Password Recovery Flow
 * ----------------------------------------------------------------------------
 */

console.log("App.jsx loaded");

import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

/**
 * AUTHENTICATION HOOKS & PROVIDERS
 */
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { useAuth, AuthProvider } from "./hooks/useAuth.jsx";

/**
 * GLOBAL UI COMPONENTS
 */
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

/**
 * CORE STATIC IMPORTS
 * (Kept static for immediate performance on primary lesson paths)
 */
import VideoLesson from "./pages/VideoLesson.jsx";
import TutorLessons from "./pages/TutorLessons.jsx";
import StudentLessonDetail from "./pages/StudentLessonDetail.jsx";
import BookingConfirmation from "./pages/BookingConfirmation.jsx";
import Settings from "./pages/Settings.jsx";
import TutorDashboard from "./pages/TutorDashboard.jsx";
import StudentReceipt from "./pages/StudentReceipt"; 

/**
 * LAZY-LOADED CORE PAGES
 * These components are loaded on-demand to reduce initial bundle size.
 */
const Home = lazy(() => import("./pages/Home.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Tutors = lazy(() => import("./pages/Tutors.jsx"));
const Students = lazy(() => import("./pages/Students.jsx"));
const TutorProfile = lazy(() => import("./pages/TutorProfile.jsx"));
const BookLesson = lazy(() => import("./pages/BookLesson.jsx"));
const Pay = lazy(() => import("./pages/Pay.jsx"));
const Availability = lazy(() => import("./pages/Availability.jsx"));
const MyLessons = lazy(() => import("./pages/MyLessons.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const Payouts = lazy(() => import("./pages/Payouts.jsx"));
const LessonEnded = lazy(() => import("./pages/LessonEnded.jsx"));
const LessonRecordings = lazy(() => import("./pages/LessonRecordings.jsx"));
const PlacementTest = lazy(() => import("./pages/PlacementTest.jsx"));

/**
 * NEW: SECURE RECOVERY PAGES
 */
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));

/**
 * ONBOARDING & SETUP PAGES
 */
const WelcomeSetup = lazy(() => import("./pages/WelcomeSetup.jsx"));
const TutorProfileSetup = lazy(() => import("./pages/TutorProfileSetup.jsx"));

/**
 * PUBLIC INFORMATION & ACADEMY MARKETING
 */
const About = lazy(() => import("./pages/About.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));

/**
 * LEGAL & COMPLIANCE
 * Standardized legal documentation for the Lernitt platform.
 */
const Terms = lazy(() => import("./pages/legal/Terms.jsx"));
const Privacy = lazy(() => import("./pages/legal/Privacy.jsx"));
const Cookies = lazy(() => import("./pages/legal/Cookies.jsx"));
const Complaints = lazy(() => import("./pages/legal/Complaints.jsx"));
const AgeRequirements = lazy(() => import("./pages/legal/AgeRequirements.jsx"));

/**
 * ERROR HANDLING
 */
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

/**
 * UTILITY: ScrollToTop
 * Ensures the window scrolls to the top coordinates on every route change.
 * Uses 'smooth' behavior for a high-end academic application feel.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

/**
 * GUARD: AdminGuard
 * Strictly restricts access to platform metrics and payouts to Bob (Admin).
 */
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

/**
 * MAIN APP COMPONENT
 * Handles global state wrappers and the React Router configuration.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Navigation UX Enhancement */}
        <ScrollToTop />
        
        {/* Persistent Branding Header */}
        <Header />
        
        {/* Content Viewport */}
        <main style={{ 
          maxWidth: 960, 
          margin: "0 auto", 
          padding: 16, 
          minHeight: "80vh" 
        }}>
          <Suspense
            fallback={
              <div style={{ 
                padding: "40px 20px", 
                textAlign: "center", 
                fontFamily: "sans-serif", 
                color: "#64748b" 
              }}>
                Initialising Lernitt instance...
              </div>
            }
          >
            <Routes>
              
              {/* =======================================================
                  PUBLIC AUTHENTICATION & ACCESS
                  ======================================================= */}
              
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* ✅ NEW: REGISTERED FORGOT PASSWORD ROUTE */}
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* =======================================================
                  MARKETING & ACADEMY INFO
                  ======================================================= */}
              
              <Route path="/about" element={<About />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/welcome-setup" element={<WelcomeSetup />} />
              <Route
                path="/tutor-profile-setup"
                element={<TutorProfileSetup />}
              />

              {/* =======================================================
                  MARKETPLACE & BOOKING ENGINE
                  ======================================================= */}
              
              <Route path="/tutors" element={<Tutors />} />
              <Route path="/tutors/:id" element={<TutorProfile />} />
              <Route path="/book/:tutorId" element={<BookLesson />} />
              <Route path="/pay/:lessonId" element={<Pay />} />
              
              {/* Post-Payment Landing */}
              <Route
                path="/confirm/:lessonId"
                element={<BookingConfirmation />}
              />
              
              {/* Package & Individual Receipts */}
              <Route
                path="/receipt/:lessonId"
                element={<StudentReceipt />}
              />
              
              <Route path="/students" element={<Students />} />

              {/* =======================================================
                  LEGAL & COMPLIANCE DOCUMENTS
                  ======================================================= */}
              
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

              {/* =======================================================
                  ADMINISTRATIVE CONTROL CENTER
                  ======================================================= */}
              
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

              {/* =======================================================
                  PROTECTED USER DASHBOARDS (Student & Tutor)
                  ======================================================= */}
              
              <Route element={<ProtectedRoute />}>
                
                {/* Logistics & Scheduling */}
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
                
                {/* Financial Profiles */}
                <Route path="/payouts" element={<Payouts />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* Communication */}
                <Route
                  path="/notifications"
                  element={<Notifications />}
                />
                <Route path="/tutor" element={<TutorDashboard />} />

                {/* Secure Classroom Environment */}
                <Route path="/video" element={<VideoLesson />} />
                <Route path="/lesson-ended" element={<LessonEnded />} />
                <Route
                  path="/lesson-recordings"
                  element={<LessonRecordings />}
                />

                {/* Pedagogy & Assessment */}
                <Route path="/placement-test" element={<PlacementTest />} />
                
              </Route>

              {/* =======================================================
                  ERROR & CATCH-ALL ROUTING
                  ======================================================= */}
              
              <Route path="*" element={<NotFound />} />
              
            </Routes>
          </Suspense>
        </main>
        
        {/* Persistent Branding Footer */}
        <Footer />
        
      </BrowserRouter>
    </AuthProvider>
  );
}
