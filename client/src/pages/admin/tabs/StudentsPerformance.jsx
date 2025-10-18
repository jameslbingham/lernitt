// client/src/pages/admin/tabs/StudentsPerformance.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

// --- Safe fetch with JWT + mock fallback ---
async function safeFetchJSON(url, opts = {}) {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    JSON.parse(localStorage.getItem("auth") || "{}")?.token ||
    "";
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const r = await fetch(url, { headers, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    if (!IS_MOCK) throw e;

    // Mock student performance data
    return {
      items: [
        {
          id: "s1",
          name: "Alice Example",
          email: "alice@example.com",
          hoursBooked: 12,
          lessonsCompleted: 10,
          repeatTutors: 2,
          trialsUsed: 2,
        },
        {
          id: "s2",
          name: "Bob Learner",
          email: "bob@example.com",
          hoursBooked: 5,
          lessonsCompleted: 4,
          repeatTutors: 1,
          trialsUsed: 1,
        },
        {
          id: "s3",
          name: "Charlie Student",
          email: "charlie@example.com",
          hoursBooked: 20,
          lessonsCompleted: 18,
          repeatTutors: 3,
          trialsUsed: 3,
        },
        {
          id: "s4",
          name: "Dana Pupil",
          email: "dana@example.com",
          hoursBooked: 7,
          lessonsCompleted: 6,
          repeatTutors: 1,
          trialsUsed: 0,
        },
      ],
    };
  }
}

export default function StudentsPerformance() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await safeFetchJSON(`${API}/api/admin/students/performance`);
      const arr = Array.isArray(data?.items) ? data.items : [];
      setItems(arr);
    } catch (e) {
      console.error("Failed to load student performance", e);
    } finally {
      setLoading(false);
    }
  }

  // Filtering by search
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(qq) ||
        s.email.toLowerCase().includes(qq)
    );
  }, [items, q]);

  // CSV export
  function exportCSV() {
    const headers = [
      "ID",
      "Name",
      "Email",
      "HoursBooked",
      "LessonsCompleted",
      "RepeatTutors",
      "TrialsUsed",
    ];
    const lines = [headers.join(",")];
    filtered.forEach((s) => {
      lines.push(
        [
          s.id,
          s.name,
          s.email,
          s.hoursBooked,
          s.lessonsCompleted,
          s.repeatTutors,
          s.trialsUsed,
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_performance_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filters + tools */}
      <div className="bg-white border rounded-2xl p-4">
        <h2 className="font-bold mb-2">Student Performance</h2>
        <input
          className="border rounded px-2 py-1 w-full mb-2"
          placeholder="Search by name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="px-3 py-1 border rounded"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Loading…" : "Reload"}
          </button>
          <button className="px-3 py-1 border rounded" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2">Hours Booked</th>
              <th className="px-3 py-2">Lessons Completed</th>
              <th className="px-3 py-2">Repeat Tutors</th>
              <th className="px-3 py-2">Trials Used</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.email}</td>
                <td className="px-3 py-2 text-center">{s.hoursBooked}</td>
                <td className="px-3 py-2 text-center">
                  {s.lessonsCompleted}
                </td>
                <td className="px-3 py-2 text-center">{s.repeatTutors}</td>
                <td className="px-3 py-2 text-center">{s.trialsUsed}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="bg-white border rounded-2xl p-4">
        <h3 className="font-semibold mb-2">Lessons Completed by Student</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={filtered}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="lessonsCompleted" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
