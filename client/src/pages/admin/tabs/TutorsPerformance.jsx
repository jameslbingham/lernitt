// client/src/pages/admin/tabs/TutorsPerformance.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

// --- Safe fetch with JWT + mock fallback ---
async function safeFetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const r = await fetch(url, { headers, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    if (!IS_MOCK) throw e;

    // === Mock tutor performance data ===
    const tutors = Array.from({ length: 10 }).map((_, i) => ({
      id: `t${i + 1}`,
      name: `Tutor ${i + 1}`,
      avgRating: (3 + Math.random() * 2).toFixed(2),
      hoursTaught: Math.floor(Math.random() * 500),
      income: Math.floor(Math.random() * 5000),
      activeStudents: Math.floor(Math.random() * 30),
    }));
    return { items: tutors };
  }
}

export default function TutorsPerformance() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await safeFetchJSON(`${API}/api/admin/tutors/performance`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    setTutors(items);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return tutors;
    return tutors.filter((t) => JSON.stringify(t).toLowerCase().includes(qq));
  }, [tutors, q]);

  function exportCSV() {
    const csv = [
      ["ID", "Name", "AvgRating", "HoursTaught", "Income", "ActiveStudents"],
      ...tutors.map((t) => [t.id, t.name, t.avgRating, t.hoursTaught, t.income, t.activeStudents]),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tutors_performance.csv";
    a.click();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      {/* Left controls */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Tools</h2>
          <input
            type="text"
            className="border rounded px-2 py-1 mb-2 w-full"
            placeholder="Search tutors…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="px-3 py-1 border rounded w-full mb-2" onClick={exportCSV}>
            Export CSV
          </button>
          <button className="px-3 py-1 border rounded w-full" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Reload"}
          </button>
        </div>
      </div>

      {/* Right display */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Tutor Performance Table</h2>
          {loading ? (
            <div>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-600">No tutors found.</div>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border">ID</th>
                  <th className="px-3 py-2 border">Name</th>
                  <th className="px-3 py-2 border">Avg Rating</th>
                  <th className="px-3 py-2 border">Hours Taught</th>
                  <th className="px-3 py-2 border">Income</th>
                  <th className="px-3 py-2 border">Active Students</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 border">{t.id}</td>
                    <td className="px-3 py-2 border">{t.name}</td>
                    <td className="px-3 py-2 border">{t.avgRating}</td>
                    <td className="px-3 py-2 border">{t.hoursTaught}</td>
                    <td className="px-3 py-2 border">{t.income} €</td>
                    <td className="px-3 py-2 border">{t.activeStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Chart */}
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Performance Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hoursTaught" fill="#8884d8" name="Hours Taught" />
              <Bar dataKey="income" fill="#82ca9d" name="Income (€)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
