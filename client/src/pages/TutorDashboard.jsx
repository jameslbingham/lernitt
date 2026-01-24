// /client/src/pages/TutorDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

// ================= NEW: Lesson Type Editor Modal =================
function LessonTypeModal({ template, onSave, onClose }) {
  const [formData, setFormData] = useState(template || {
    title: "",
    description: "",
    priceSingle: 0,
    packageFiveDiscount: 0,
    isActive: true
  });

  const totalPackagePrice = (formData.priceSingle * 5) - formData.packageFiveDiscount;
  const avgPrice = totalPackagePrice / 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Edit this Lesson</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Title</span>
            <input 
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.title}
              placeholder="e.g. Business English"
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Description</span>
            <textarea 
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.description}
              placeholder="Explain what the student will learn..."
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </label>

          <div className="grid grid-cols-2 gap-4 border-t pt-5">
            <label>
              <span className="text-sm font-bold text-slate-700">Single Lesson ($)</span>
              <input 
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                value={formData.priceSingle}
                onChange={(e) => setFormData({...formData, priceSingle: Number(e.target.value)})}
              />
            </label>
            <label>
              <span className="text-sm font-bold text-indigo-600">5-Lesson Disc. ($)</span>
              <input 
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 bg-indigo-50 font-bold text-indigo-700"
                value={formData.packageFiveDiscount}
                onChange={(e) => setFormData({...formData, packageFiveDiscount: Number(e.target.value)})}
              />
            </label>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm flex justify-between items-center border border-slate-100">
            <div>
              <span className="text-slate-500">Package Price:</span>
              <span className="ml-2 font-black text-slate-900">${totalPackagePrice.toFixed(2)}</span>
            </div>
            <div className="text-indigo-600 font-bold">
              Avg: ${avgPrice.toFixed(2)} / lesson
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button 
            onClick={() => onSave(formData)}
            style={{ background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}
            className="flex-1 rounded-xl py-3 font-bold hover:bg-indigo-700 transition"
          >
            Save Lesson Type
          </button>
          <button onClick={onClose} style={{ cursor: 'pointer' }} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= NEW: Lesson Types Manager (Slots 1-8) =================
function LessonTypesManager({ currentTemplates, onUpdate }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const slots = Array.from({ length: 8 }, (_, i) => currentTemplates[i] || null);

  const handleSave = (updatedData) => {
    const newTemplates = [...slots];
    newTemplates[editingIndex] = updatedData;
    onUpdate(newTemplates.filter(t => t && t.title)); 
    setEditingIndex(null);
  };

  return (
    <section style={{ marginTop: 24, borderRadius: 16, border: "1px solid #e5e7eb", background: "white", overflow: "hidden" }}>
      <div style={{ padding: 16, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Manage Lesson Types (Up to 8)</h2>
        <p style={{ fontSize: 14, opacity: 0.7 }}>Define your lesson descriptions and dollar discounts for packages.</p>
      </div>
      
      <div style={{ padding: 16 }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {slots.map((template, idx) => (
          <div key={idx} style={{ padding: 12, borderRadius: 12, border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>Slot {idx + 1}</span>
              {template ? (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{template.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>${template.priceSingle} / session</div>
                </div>
              ) : (
                <span style={{ color: "#cbd5e1", fontSize: 13, fontStyle: "italic" }}>Empty Slot</span>
              )}
            </div>
            <button onClick={() => setEditingIndex(idx)} style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", border: "1px solid #e0e7ff", borderRadius: 8, padding: "4px 10px", cursor: 'pointer', background: 'white' }}>
              {template ? "Edit" : "Set Up"}
            </button>
          </div>
        ))}
      </div>

      {editingIndex !== null && (
        <LessonTypeModal 
          template={slots[editingIndex]} 
          onSave={handleSave} 
          onClose={() => setEditingIndex(null)} 
        />
      )}
    </section>
  );
}

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

// ================= UPDATED: Earnings Summary with Escrow Logic =================
function EarningsSummary() {
  const { token } = useAuth();
  const [earnings, setEarnings] = useState({
    totalEarned: 0,   // Money from completed lessons (85%)
    packageEscrow: 0, // Money paid for packages but lessons not yet given
    pendingPayout: 0, // Money earned but not yet sent to PayPal/Stripe
    refunded: 0,
  });

  async function load() {
    try {
      const data = await apiFetch("/api/finance/tutor-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEarnings(data || { totalEarned: 0, packageEscrow: 0, pendingPayout: 0, refunded: 0 });
    } catch {
      setEarnings({ totalEarned: 0, packageEscrow: 0, pendingPayout: 0, refunded: 0 });
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: 20,
        marginTop: 20,
        borderRadius: 16,
        border: "1px solid #e0f2fe"
      }}
    >
      <h3 style={{ color: "#075985", marginBottom: 12 }}>💰 Earnings Summary</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>Total Earned</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#0369a1' }}>
            ${earnings.totalEarned?.toFixed(2) || "0.00"}
          </p>
          <p style={{ fontSize: 10, opacity: 0.6 }}>Released after completion</p>
        </div>

        <div>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>Package Escrow</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>
            ${earnings.packageEscrow?.toFixed(2) || "0.00"}
          </p>
          <p style={{ fontSize: 10, opacity: 0.6 }}>Unused bundle credits</p>
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Pending Payout:</span>
          <span style={{ marginLeft: 6, fontWeight: 800 }}>${earnings.pendingPayout?.toFixed(2) || "0.00"}</span>
        </div>
        {earnings.refunded > 0 && (
          <div style={{ color: '#b91c1c', fontSize: 13 }}>
            Refunded: ${earnings.refunded.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

// ================= Tutor Onboarding Checklist =================
function TutorOnboardingPanel() {
  return (
    <section
      style={{
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        Getting set up as a tutor
      </h2>
      <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 10 }}>
        Follow these steps so students can find, book, and pay you.
      </p>

      <ol style={{ paddingLeft: 18, fontSize: 14, marginBottom: 10 }}>
        <li style={{ marginBottom: 6 }}>
          Add your public details, headline, languages, and bio.
        </li>
        <li style={{ marginBottom: 6 }}>
          Set weekly availability so students can book time slots.
        </li>
        <li>Check your hourly rate and review payouts and earnings.</li>
      </ol>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 4,
        }}
      >
        <Link
          to="/tutor-profile-setup"
          className="inline-block rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
        >
          1) Tutor profile
        </Link>
        <Link
          to="/availability"
          className="inline-block rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
        >
          2) Availability
        </Link>
        <Link
          to="/payouts"
          className="inline-block rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
        >
          3) Payouts & pricing
        </Link>
      </div>
    </section>
  );
}

// ================= Main Tutor Dashboard =================
export default function TutorDashboard() {
  const { getToken, user, login } = useAuth();
  const [upcoming, setUpcoming] = useState(null);
  const [unread, setUnread] = useState(null);
  const [err, setErr] = useState("");

  const tutorStatus = user?.tutorStatus || user?.status || null;
  const isRejectedTutor = user?.role === "tutor" && tutorStatus === "rejected";

  const handleTemplatesUpdate = async (newTemplates) => {
    try {
      const token = getToken();
      const updatedUser = await apiFetch(`/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lessonTemplates: newTemplates })
      });
      login(token, updatedUser); 
      alert("✅ Lesson types saved!");
    } catch (err) {
      alert("❌ Failed to save.");
    }
  };

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
        const qs = new URLSearchParams({
          upcoming: "1",
          mine: "1",
        }).toString();
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
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-500">
            <Link
              to="/tutor-lessons"
              className="inline-flex items-center gap-1 hover:underline"
            >
              ← Back to tutor lessons
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Tutor dashboard</h1>
          <p className="text-sm text-slate-600">
            Manage your availability, upcoming lessons, and earnings in one
            place.
          </p>
        </div>

        <Link
          to="/tutor-lessons"
          className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md"
        >
          View all lessons
        </Link>
      </div>

      <TutorOnboardingPanel />

      {isRejectedTutor && (
        <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 space-y-2">
          <h2 className="text-base font-semibold">
            Your tutor profile wasn&apos;t approved
          </h2>
          <p>
            Our team reviewed your tutor profile and it{" "}
            <strong>wasn&apos;t approved for public listings</strong> yet.
            Students can&apos;t currently find or book you on Lernitt.
          </p>
          <p>
            Please review your profile details (headline, bio, experience,
            pricing) and make sure they:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Clearly explain who you teach and how you help</li>
            <li>Show your qualifications and experience</li>
            <li>Use clear, professional English</li>
          </ul>
          <p>
            When you&apos;re ready, update your profile and{" "}
            <strong>contact support to request another review</strong>.
          </p>
        </section>
      )}

      {/* SURGICAL INSERTION OF LESSON TYPES MANAGER */}
      <LessonTypesManager 
        currentTemplates={user?.lessonTemplates || []} 
        onUpdate={handleTemplatesUpdate} 
      />

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
          Students can’t book lessons until you choose your times.
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
