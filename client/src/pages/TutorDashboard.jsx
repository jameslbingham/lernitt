// /client/src/pages/TutorDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

// ================= Availability Panel =================
function AvailabilityPanel() {
  const { token } = useAuth();
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState("UTC");
  const [newDay, setNewDay] = useState("1");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  async function load() {
    try {
      const data = await apiFetch("/api/availability/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailability(data);
      setTimezone(data.timezone || "UTC");
    } catch {
      setAvailability(null);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      const updated = await apiFetch("/api/availability", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timezone,
          weekly: availability?.weekly || [],
        }),
      });
      alert("✅ Availability saved!");
      setAvailability(updated);
    } catch {
      alert("❌ Failed to save.");
    }
  }

  function addRange() {
    const dayIndex = parseInt(newDay, 10);
    const newRange = { start: newStart, end: newEnd };
    let newWeekly = [...(availability?.weekly || [])];
    let existing = newWeekly.find((w) => w.dow === dayIndex);
    if (!existing) {
      existing = { dow: dayIndex, ranges: [] };
      newWeekly.push(existing);
    }
    existing.ranges.push(newRange);
    setAvailability({ ...availability, weekly: newWeekly });
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Loading availability…</p>;

  return (
    <div style={{ marginTop: 20, fontFamily: "Inter, sans-serif" }}>
      <h2 style={{ color: "#1e3a8a" }}>🗓️ Tutor Availability</h2>

      {/* Timezone */}
      <section style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500 }}>
          Timezone:&nbsp;
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{
              width: 220,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
        </label>
      </section>

      {/* Weekly availability */}
      <section
        style={{
          background: "#f8fafc",
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <h3 style={{ color: "#0369a1" }}>Weekly Schedule</h3>

        <div style={{ marginBottom: 10 }}>
          <select
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            style={{ marginRight: 8 }}
          >
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
          <input
            type="time"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            style={{ marginRight: 6 }}
          />
          <input
            type="time"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            style={{ marginRight: 6 }}
          />
          <button onClick={addRange}>➕ Add Range</button>
        </div>

        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {(availability?.weekly || []).map((w, i) => (
            <li
              key={i}
              style={{
                background: "#fff",
                padding: 8,
                borderRadius: 6,
                marginBottom: 6,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              <b>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][w.dow]}:
              </b>{" "}
              {w.ranges.map((r, j) => (
                <span key={j}>
                  {r.start}–{r.end}
                  {j < w.ranges.length - 1 ? ", " : ""}
                </span>
              ))}
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 10 }}>
          <button onClick={save}>💾 Save</button>
          <button onClick={load} style={{ marginLeft: 10 }}>
            ↻ Refresh
          </button>
        </div>
      </section>

      {/* Exceptions */}
      <section
        style={{
          background: "#fff7ed",
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <h3 style={{ color: "#b45309" }}>Exceptions</h3>
        <p style={{ fontSize: "0.9rem" }}>Open or close specific dates.</p>

        <input type="date" id="excDate" style={{ marginRight: 6 }} />
        <select id="excOpen" defaultValue="true" style={{ marginRight: 6 }}>
          <option value="true">Open</option>
          <option value="false">Closed</option>
        </select>
        <button
          onClick={async () => {
            const date = document.getElementById("excDate").value;
            const open = document.getElementById("excOpen").value === "true";
            if (!date) return alert("Select a date first!");
            try {
              await apiFetch("/api/availability/exceptions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  date,
                  open,
                  ranges: open ? [{ start: "09:00", end: "17:00" }] : [],
                }),
              });
              alert("✅ Exception saved!");
              await load();
            } catch {
              alert("❌ Failed to save exception.");
            }
          }}
        >
          ➕ Add Exception
        </button>

        <ul>
          {(availability?.exceptions || []).map((e, i) => (
            <li key={i}>
              {e.date}: {e.open ? "Open" : "Closed"}{" "}
              <button
                onClick={async () => {
                  await apiFetch(`/api/availability/exceptions/${e.date}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  alert("🗑️ Exception removed");
                  await load();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <pre
        style={{
          background: "#f1f5f9",
          padding: 10,
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(availability, null, 2)}
      </pre>
    </div>
  );
}

// ================= Today's Lessons =================
function TutorLessonSummary() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState([]);

  async function load() {
    try {
      const list = await apiFetch(`/api/tutor-lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLessons(Array.isArray(list) ? list : []);
    } catch {
      setLessons([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todaysLessons = lessons.filter(
    (l) => l.startTime && l.startTime.startsWith(today)
  );

  return (
    <div
      style={{
        background: "#eef2ff",
        padding: 16,
        marginTop: 20,
        borderRadius: 12,
      }}
    >
      <h3 style={{ color: "#3730a3" }}>📘 Today’s Lessons</h3>
      {todaysLessons.length === 0 ? (
        <p>No lessons scheduled today.</p>
      ) : (
        <ul>
          {todaysLessons.map((l, i) => (
            <li key={i}>
              <b>
                {new Date(l.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </b>{" "}
              with {l.studentName || "student"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================= Weekly Stats =================
function WeeklyStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ lessons: 0, income: 0 });

  async function load() {
    try {
      const data = await apiFetch("/api/metrics/tutor-weekly", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(data || { lessons: 0, income: 0 });
    } catch {
      setStats({ lessons: 0, income: 0 });
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        background: "#ecfdf5",
        padding: 16,
        marginTop: 20,
        borderRadius: 12,
      }}
    >
      <h3 style={{ color: "#065f46" }}>📊 Weekly Stats</h3>
      <p>
        Lessons this week: <b>{stats.lessons}</b>
      </p>
      <p>
        Estimated income: <b>${stats.income.toFixed(2)}</b>
      </p>
    </div>
  );
}

// ================= Upcoming Bookings =================
function UpcomingBookings() {
  const { token } = useAuth();
  const [upcoming, setUpcoming] = useState([]);

  async function load() {
    try {
      const list = await apiFetch("/api/tutor-lessons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const now = new Date();
      const weekLater = new Date(now);
      weekLater.setDate(now.getDate() + 7);

      const next7 = (Array.isArray(list) ? list : []).filter((l) => {
        const start = new Date(l.startTime);
        return start >= now && start <= weekLater;
      });

      setUpcoming(next7);
    } catch {
      setUpcoming([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        background: "#fef9c3",
        padding: 16,
        marginTop: 20,
        borderRadius: 12,
      }}
    >
      <h3 style={{ color: "#92400e" }}>🗓️ Upcoming Bookings (next 7 days)</h3>
      {upcoming.length === 0 ? (
        <p>No upcoming lessons.</p>
      ) : (
        <ul>
          {upcoming.map((l, i) => (
            <li key={i}>
              <b>{new Date(l.startTime).toLocaleDateString()}</b> –{" "}
              {new Date(l.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              with {l.studentName || "student"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================= Earnings Summary =================
function EarningsSummary() {
  const { token } = useAuth();
  const [earnings, setEarnings] = useState({
    total: 0,
    pending: 0,
    refunded: 0,
  });

  async function load() {
    try {
      const data = await apiFetch("/api/finance/tutor-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEarnings(data || { total: 0, pending: 0, refunded: 0 });
    } catch {
      setEarnings({ total: 0, pending: 0, refunded: 0 });
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: 16,
        marginTop: 20,
        borderRadius: 12,
      }}
    >
      <h3 style={{ color: "#075985" }}>💰 Earnings Summary</h3>
      <p>
        Total earned: <b>${earnings.total.toFixed(2)}</b>
      </p>
      <p>
        Pending payout: <b>${earnings.pending.toFixed(2)}</b>
      </p>
      <p>
        Refunded: <b>${earnings.refunded.toFixed(2)}</b>
      </p>
    </div>
  );
}

// ================= Main Tutor Dashboard =================
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
        const notes = await apiFetch(
          `${import.meta.env.VITE_API}/api/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const unreadCount = Array.isArray(notes)
          ? notes.filter((n) => !n.read).length
          : 0;
        setUnread(unreadCount);
      } catch {
        setUnread(0);
      }

      try {
        const qs = new URLSearchParams({ upcoming: "1", mine: "1" }).toString();
        const lessons = await apiFetch(
          `${import.meta.env.VITE_API}/api/tutor-lessons?${qs}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const count = Array.isArray(lessons) ? lessons.length : 0;
        setUpcoming(count);
      } catch {
        setUpcoming(0);
      }
    }
    load();
  }, [getToken]);

  return (
    <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
      <h1>Tutor Dashboard</h1>

      {/* ✅ NEW: Big primary CTA for best UX */}
      <div
        style={{
          marginTop: 16,
          borderRadius: 16,
          padding: 18,
          background: "#4f46e5",
          color: "white",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          Set your availability
        </div>
        <div style={{ marginTop: 6, opacity: 0.95 }}>
          Students can’t book lessons until you set your times.
        </div>

        <div style={{ marginTop: 12 }}>
          <Link
            to="/availability"
            className="inline-block rounded-lg bg-white px-4 py-2 font-semibold text-indigo-700 hover:opacity-90"
          >
            Open availability
          </Link>
        </div>
      </div>

      <p className="mt-4">
        <Link
          to="/availability"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700"
        >
          Manage availability
        </Link>
      </p>

      <p>Welcome! This page shows your lessons, students, and earnings.</p>

      {err && <div style={{ background: "#fee2e2", padding: 8 }}>{err}</div>}

      <section style={{ marginTop: 24 }}>
        <h2>Today</h2>
        <ul>
          <li>Upcoming lessons: {upcoming === null ? "…" : upcoming}</li>
          <li>Unread messages: {unread === null ? "…" : unread}</li>
        </ul>
      </section>

      <AvailabilityPanel />
      <TutorLessonSummary />
      <WeeklyStats />
      <UpcomingBookings />
      <EarningsSummary />

      <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Logged in as {user?.email}
      </div>
    </div>
  );
}
