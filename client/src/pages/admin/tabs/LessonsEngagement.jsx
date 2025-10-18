// client/src/pages/admin/tabs/LessonsEngagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/* =========================
   Utils
========================= */
function fmtDateISO(d) {
  if (!d) return "";
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return "";
  const m = String(dd.getMonth() + 1).padStart(2, "0");
  const day = String(dd.getDate()).padStart(2, "0");
  return `${dd.getFullYear()}-${m}-${day}`;
}
function monthKey(d) {
  const dd = new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`;
}
function csvDownload(filename, rows) {
  const csv = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

/* =========================
   Safe fetch (JWT + mocks)
========================= */
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
    const txt = await r.text();
    return txt ? JSON.parse(txt) : {};
  } catch (e) {
    if (!IS_MOCK) throw e;

    // --------- MOCK GENERATOR (12 months) ----------
    const urlObj = new URL(url, "http://x");
    const from = urlObj.searchParams.get("from");
    const to = urlObj.searchParams.get("to");
    const filterCountry = (urlObj.searchParams.get("country") || "").toLowerCase();
    const filterCategory = (urlObj.searchParams.get("category") || "").toLowerCase();
    const filterLevel = (urlObj.searchParams.get("level") || "").toLowerCase();

    const countries = ["Spain", "Germany", "Brazil", "Japan", "USA", "France", "Italy", "UK"];
    const categories = ["English", "Spanish", "German", "French", "Math", "Science", "Coding"];
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const now = new Date();
    const months = range(12).map((i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      d.setDate(1);
      return new Date(d);
    });

    function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function randFloat(min, max, dp = 2) {
      const val = Math.random() * (max - min) + min;
      return parseFloat(val.toFixed(dp));
    }

    // per-month base volumes
    const monthlyBase = months.map((m) => {
      const lessons = rand(400, 1100);
      const avgMinsBooked = rand(40, 60);
      const avgMinsActual = Math.max(25, Math.round(avgMinsBooked * randFloat(0.75, 0.98)));
      return {
        month: monthKey(m),
        lessons,
        avgMinsBooked,
        avgMinsActual,
      };
    });

    // Build lesson dataset
    let lessons = [];
    monthlyBase.forEach((mm, idx) => {
      range(mm.lessons).forEach((i) => {
        const category = categories[rand(0, categories.length - 1)];
        const country = countries[rand(0, countries.length - 1)];
        const level = levels[rand(0, levels.length - 1)];
        const isTrial = Math.random() < 0.18;
        const isGroup = !isTrial && Math.random() < 0.12;
        const type = isTrial ? "trial" : isGroup ? "group" : "paid";

        const bookedMins =
          Math.max(20, Math.round(mm.avgMinsBooked * randFloat(0.8, 1.2)));
        const actualMins = Math.max(
          15,
          Math.round(bookedMins * randFloat(isTrial ? 0.7 : 0.8, 1.05))
        );

        const dt = new Date(now);
        dt.setMonth(now.getMonth() - (11 - idx));
        dt.setDate(rand(1, 28));
        dt.setHours(rand(6, 22), rand(0, 59), 0, 0);

        // reliability outcomes
        const rRoll = Math.random();
        let status = "completed";
        if (rRoll < 0.06) status = "cancelled";
        else if (rRoll < 0.12) status = "rescheduled";
        else if (rRoll < 0.16) status = "no_show";

        const hours = actualMins / 60;

        lessons.push({
          id: `L-${idx}-${i}`,
          month: monthKey(dt),
          dateISO: dt.toISOString(),
          hour: dt.getHours(),
          day: dt.getDay(), // 0..6
          category,
          country,
          level,
          type, // trial | paid | group
          bookedMins,
          actualMins,
          status, // completed | cancelled | rescheduled | no_show
          studentId: `s${rand(1, 3000)}`,
          tutorId: `t${rand(1, 1200)}`,
          hours,
        });
      });
    });

    // Filters
    lessons = lessons.filter((l) => {
      let ok = true;
      if (from && new Date(l.dateISO) < new Date(from)) ok = false;
      if (to && new Date(l.dateISO) > new Date(to)) ok = false;
      if (filterCountry && !l.country.toLowerCase().includes(filterCountry)) ok = false;
      if (filterCategory && !l.category.toLowerCase().includes(filterCategory)) ok = false;
      if (filterLevel && !l.level.toLowerCase().includes(filterLevel)) ok = false;
      return ok;
    });

    // lessons per student distribution
    const perStudent = new Map();
    lessons.forEach((l) => perStudent.set(l.studentId, (perStudent.get(l.studentId) || 0) + 1));
    const dist = new Map(); // bucket -> count
    perStudent.forEach((cnt) => {
      const b = cnt >= 11 ? "11+" : String(cnt);
      dist.set(b, (dist.get(b) || 0) + 1);
    });
    const lessonsPerStudentDist = Array.from(dist.entries())
      .sort((a, b) => {
        const na = a[0] === "11+" ? 11 : parseInt(a[0], 10);
        const nb = b[0] === "11+" ? 11 : parseInt(b[0], 10);
        return na - nb;
      })
      .map(([lessons, students]) => ({ lessons, students }));

    // tutor activity per month
    const lessonsByMonth = new Map(); // month -> { lessons, hours }
    lessons.forEach((l) => {
      const rec = lessonsByMonth.get(l.month) || { lessons: 0, hours: 0 };
      rec.lessons += 1;
      rec.hours += l.hours;
      lessonsByMonth.set(l.month, rec);
    });
    const tutorActivity = Array.from(lessonsByMonth.entries())
      .map(([month, v]) => ({ month, lessons: v.lessons, hours: +v.hours.toFixed(2) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // thresholds
    const totalStudents = perStudent.size || 1;
    const over3 = Array.from(perStudent.values()).filter((n) => n > 3).length;
    const oneAndDone = Array.from(perStudent.values()).filter((n) => n === 1).length;
    const thresholdKpis = {
      over3Rate: +((over3 / totalStudents) * 100).toFixed(2),
      oneAndDoneRate: +((oneAndDone / totalStudents) * 100).toFixed(2),
    };

    // hour/day heatmap
    const heat = new Map(); // day->hour->count
    range(7).forEach((d) => heat.set(d, new Map()));
    lessons.forEach((l) => {
      const row = heat.get(l.day);
      row.set(l.hour, (row.get(l.hour) || 0) + 1);
    });
    const heatmapHourDay = [];
    heat.forEach((row, day) => {
      for (let h = 0; h < 24; h++) {
        heatmapHourDay.push({ day, hour: h, count: row.get(h) || 0 });
      }
    });

    // type breakdown
    const tMap = new Map();
    lessons.forEach((l) => tMap.set(l.type, (tMap.get(l.type) || 0) + 1));
    const typeBreakdown = Array.from(tMap.entries()).map(([type, count]) => ({ type, count }));

    // reliability
    const relMap = new Map(); // month -> {cancelled,rescheduled,noShow}
    lessons.forEach((l) => {
      const rec = relMap.get(l.month) || { cancelled: 0, rescheduled: 0, noShow: 0, total: 0 };
      if (l.status === "cancelled") rec.cancelled += 1;
      else if (l.status === "rescheduled") rec.rescheduled += 1;
      else if (l.status === "no_show") rec.noShow += 1;
      rec.total += 1;
      relMap.set(l.month, rec);
    });
    const reliabilityRates = Array.from(relMap.entries())
      .map(([month, v]) => ({
        month,
        cancellation: v.total ? +((v.cancelled / v.total) * 100).toFixed(2) : 0,
        reschedule: v.total ? +((v.rescheduled / v.total) * 100).toFixed(2) : 0,
        noShow: v.total ? +((v.noShow / v.total) * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // duration variance
    const durMap = new Map(); // month -> { booked, actual }
    lessons.forEach((l) => {
      const rec = durMap.get(l.month) || { b: 0, a: 0, n: 0 };
      rec.b += l.bookedMins;
      rec.a += l.actualMins;
      rec.n += 1;
      durMap.set(l.month, rec);
    });
    const durationVariance = Array.from(durMap.entries())
      .map(([month, v]) => ({
        month,
        bookedMins: Math.round(v.b / Math.max(1, v.n)),
        actualMins: Math.round(v.a / Math.max(1, v.n)),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      lessonsPerStudentDist,
      tutorActivity,
      thresholdKpis,
      heatmapHourDay,
      typeBreakdown,
      reliabilityRates,
      durationVariance,
    };
  }
}

/* =========================
   Component
========================= */
export default function LessonsEngagement() {
  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");

  // data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (country) params.append("country", country);
    if (category) params.append("category", category);
    if (level) params.append("level", level);
    const res = await safeFetchJSON(`${API}/api/admin/metrics/lessons?${params.toString()}`);
    setData(res || {});
    setLoading(false);
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setCountry("");
    setCategory("");
    setLevel("");
  }

  /* =========================
     CSV exporters
  ========================= */
  function exportLessonsPerStudentCSV() {
    const rows = [["Lessons", "Students"], ...(data?.lessonsPerStudentDist || []).map((x) => [x.lessons, x.students])];
    csvDownload(`lessons_per_student_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportTutorActivityCSV() {
    const rows = [["Month", "Lessons", "Hours"], ...(data?.tutorActivity || []).map((x) => [x.month, x.lessons, x.hours])];
    csvDownload(`tutor_activity_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportThresholdKpisCSV() {
    const rows = [
      ["Metric", "Value (%)"],
      ["Students with >3 lessons", data?.thresholdKpis?.over3Rate ?? 0],
      ["One-and-done students", data?.thresholdKpis?.oneAndDoneRate ?? 0],
    ];
    csvDownload(`threshold_kpis_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportHeatmapCSV() {
    const rows = [["Day(0=Sun)", "Hour(0-23)", "Count"], ...(data?.heatmapHourDay || []).map((x) => [x.day, x.hour, x.count])];
    csvDownload(`peak_times_heatmap_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportTypeBreakdownCSV() {
    const rows = [["Type", "Count"], ...(data?.typeBreakdown || []).map((x) => [x.type, x.count])];
    csvDownload(`type_breakdown_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportReliabilityCSV() {
    const rows = [
      ["Month", "Cancellation(%)", "Reschedule(%)", "NoShow(%)"],
      ...(data?.reliabilityRates || []).map((x) => [x.month, x.cancellation, x.reschedule, x.noShow]),
    ];
    csvDownload(`reliability_rates_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportDurationVarianceCSV() {
    const rows = [["Month", "BookedMins", "ActualMins"], ...(data?.durationVariance || []).map((x) => [x.month, x.bookedMins, x.actualMins])];
    csvDownload(`duration_variance_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportAllCSVs() {
    exportLessonsPerStudentCSV();
    exportTutorActivityCSV();
    exportThresholdKpisCSV();
    exportHeatmapCSV();
    exportTypeBreakdownCSV();
    exportReliabilityCSV();
    exportDurationVarianceCSV();
  }

  if (loading) return <div className="p-4">Loading…</div>;

  // Simple table heat coloring helper for heatmap
  const heatMax = useMemo(
    () => Math.max(1, ...(data?.heatmapHourDay || []).map((x) => x.count)),
    [data?.heatmapHourDay]
  );
  function heatCellColor(v) {
    const t = v / heatMax; // 0..1
    const alpha = Math.min(1, 0.08 + t * 0.92);
    return `rgba(59,130,246,${alpha})`; // blue-ish
  }

  return (
    <div className="p-4 space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 space-y-2">
        <h2 className="font-bold mb-2">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border px-2 py-1 rounded" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border px-2 py-1 rounded" />
          <input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="border px-2 py-1 rounded" />
          <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="border px-2 py-1 rounded" />
          <input placeholder="Level (A1…C2)" value={level} onChange={(e) => setLevel(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={load} className="px-3 py-1 border rounded">Apply</button>
          <button onClick={clearFilters} className="px-3 py-1 border rounded">Clear</button>
          <button onClick={exportAllCSVs} className="px-3 py-1 border rounded">Export All CSVs</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="bg-white border rounded-2xl p-4">
        <h3 className="font-bold mb-3">Engagement KPIs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-xl p-3">
            <div className="text-xs text-gray-500">Students with &gt; 3 lessons</div>
            <div className="text-2xl font-semibold mt-1">{data?.thresholdKpis?.over3Rate ?? 0}%</div>
          </div>
          <div className="border rounded-xl p-3">
            <div className="text-xs text-gray-500">One-and-done students</div>
            <div className="text-2xl font-semibold mt-1">{data?.thresholdKpis?.oneAndDoneRate ?? 0}%</div>
          </div>
        </div>
        <div className="mt-3">
          <button onClick={exportThresholdKpisCSV} className="px-3 py-1 border rounded">Export KPI CSV</button>
        </div>
      </div>

      {/* Lessons per student distribution */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Lessons per Student (distribution)</h3>
          <button onClick={exportLessonsPerStudentCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.lessonsPerStudentDist?.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.lessonsPerStudentDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lessons" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="students" name="# Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No distribution data.</div>}
      </div>

      {/* Tutor activity */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Tutor Activity (Lessons & Hours per Month)</h3>
          <button onClick={exportTutorActivityCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.tutorActivity?.length ? (
          <div className="w-full" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.tutorActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="lessons" name="Lessons" />
                <Line type="monotone" dataKey="hours" name="Hours" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No activity data.</div>}
      </div>

      {/* Type breakdown */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Lesson Type Breakdown</h3>
          <button onClick={exportTypeBreakdownCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.typeBreakdown?.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ReTooltip />
                <Legend />
                <Pie
                  data={data.typeBreakdown}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={(x) => `${x.type} (${x.count})`}
                >
                  {data.typeBreakdown.map((_, idx) => (
                    <Cell key={idx} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No breakdown data.</div>}
      </div>

      {/* Reliability */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Reliability Rates</h3>
          <button onClick={exportReliabilityCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.reliabilityRates?.length ? (
          <div className="w-full" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.reliabilityRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="cancellation" name="Cancellation (%)" />
                <Line type="monotone" dataKey="reschedule" name="Reschedule (%)" />
                <Line type="monotone" dataKey="noShow" name="No-Show (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No reliability data.</div>}
      </div>

      {/* Duration variance */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Booked vs Actual Duration (mins)</h3>
          <button onClick={exportDurationVarianceCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.durationVariance?.length ? (
          <div className="w-full" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.durationVariance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="bookedMins" name="Booked (mins)" />
                <Line type="monotone" dataKey="actualMins" name="Actual (mins)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No duration data.</div>}
      </div>

      {/* Peak times heatmap (table) */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Peak Lesson Times (Day × Hour)</h3>
          <button onClick={exportHeatmapCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.heatmapHourDay?.length ? (
          <table className="min-w-full text-xs border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 border">Day \ Hour</th>
                {range(24).map((h) => (
                  <th key={h} className="px-2 py-1 border text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {range(7).map((d) => (
                <tr key={d}>
                  <td className="px-2 py-1 border font-medium">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]}</td>
                  {range(24).map((h) => {
                    const rec = data.heatmapHourDay.find((x) => x.day === d && x.hour === h);
                    const v = rec?.count || 0;
                    return (
                      <td
                        key={h}
                        className="px-1 py-1 border text-center"
                        style={{ backgroundColor: v ? heatCellColor(v) : "transparent" }}
                        title={`${v}`}
                      >
                        {v || ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-gray-500">No heatmap data.</div>}
      </div>
    </div>
  );
}
