// /client/src/pages/TutorDashboard.jsx
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiFetch";
import { useAuth } from "../hooks/useAuth";

export default function TutorDashboard() {
  const { getToken, user } = useAuth();
  const [upcoming, setUpcoming] = useState(null);
  const [unread, setUnread] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      const token = getToken();
      if (!token) return;

      try {
        // Unread notifications (works for any role)
        const notes = await apiFetch(
          `${import.meta.env.VITE_API}/api/notifications`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const unreadCount = Array.isArray(notes)
          ? notes.filter((n) => !n.read).length
          : 0;
        setUnread(unreadCount);
      } catch (e) {
        setUnread(0);
      }

      try {
        // Upcoming tutor lessons (if user is a tutor; else returns 0)
        const qs = new URLSearchParams({ upcoming: "1", mine: "1" }).toString();
        const lessons = await apiFetch(
          `${import.meta.env.VITE_API}/api/tutor-lessons?${qs}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const count = Array.isArray(lessons) ? lessons.length : 0;
        setUpcoming(count);
      } catch (e) {
        // Not a tutor or endpoint empty
        setUpcoming(0);
      }
    }
    load();
  }, [getToken]);

  return (
    <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Tutor Dashboard</h1>
      <p style={{ marginTop: 0 }}>
        Welcome! This page shows your lessons, students, and earnings.
      </p>

      {err && (
        <div style={{ background: "#fee2e2", padding: 8, marginTop: 12 }}>
          {err}
        </div>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>Today</h2>
        <ul>
          <li>Upcoming lessons: {upcoming === null ? "…" : upcoming}</li>
          <li>Unread messages: {unread === null ? "…" : unread}</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Quick actions</h2>
        <ul>
          <li><a href="/availability">Open calendar</a></li>
          <li><a href="/notifications">Message a student</a></li>
          <li><a href="/payouts">Review payouts</a></li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Stats (this month)</h2>
        <ul>
          <li>Lessons taught: —</li>
          <li>Earnings: —</li>
          <li>New students: —</li>
        </ul>
      </section>

      <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Logged in as {user?.email}
      </div>
    </div>
  );
}
