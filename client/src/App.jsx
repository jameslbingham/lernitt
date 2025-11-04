// trigger rebuild
// client/src/App.jsx
console.log("App.jsx loaded");

import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import Favourites from "./pages/Favourites.jsx";
import { apiFetch } from "./lib/apiFetch.js";
import { useAuth } from "./hooks/useAuth.js";

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

// ---- Admin Guard (mock + live) ---------------------------------------------
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}
function AdminGuard({ children }) {
  const user = getUser();
  if (user?.role === "admin") return children;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
  return null;
}
// ----------------------------------------------------------------------------

function Nav() {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  const { isAuthed, logout, getToken } = useAuth();

  async function fetchUnread() {
    const token = getToken();
    if (!token) return setUnread(0);
    try {
      const list = await apiFetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnrea
