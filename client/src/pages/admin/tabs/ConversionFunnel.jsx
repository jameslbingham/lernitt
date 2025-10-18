// client/src/pages/admin/tabs/ConversionFunnel.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  ResponsiveContainer,
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
    // Filters from querystring (best-effort simulation)
    const urlObj = new URL(url, "http://x");
    const from = urlObj.searchParams.get("from");
    const to = urlObj.searchParams.get("to");
    const filterCountry = (urlObj.searchParams.get("country") || "").toLowerCase();
    const filterCategory = (urlObj.searchParams.get("category") || "").toLowerCase();
    const filterLevel = (urlObj.searchParams.get("level") || "").toLowerCase();

    // Domains
    const countries = ["Spain", "Germany", "Brazil", "Japan", "USA", "France", "Italy", "UK"];
    const categories = ["English", "Spanish", "German", "French", "Math", "Science", "Coding"];
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"]; // <-- define ONCE here
    const currencies = ["EUR", "USD", "GBP"];
    const now = new Date();
    const months = range(12).map((i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      d.setDate(1);
      return new Date(d);
    });

    // Synthetic base volumes
    function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function randFloat(min, max, dp = 2) {
      const val = Math.random() * (max - min) + min;
      return parseFloat(val.toFixed(dp));
    }

    // Build per-month users and lessons to derive metrics
    const monthly = months.map((m) => {
      const signups = rand(200, 800);
      const firstBookings = Math.floor(signups * randFloat(0.45, 0.75));
      const repeatBookings = Math.floor(firstBookings * randFloat(0.45, 0.7));

      return {
        month: monthKey(m),
        signups,
        firstBookings,
        repeatBookings,
      };
    });

    // Lessons catalog for popularity, country, revenue, etc.
    // Generate ~ N lessons per month, each with category, country, level, price
    let lessons = [];
    monthly.forEach((mm, idx) => {
      const baseL = Math.max(mm.firstBookings + mm.repeatBookings, 50);
      const nLessons = Math.floor(baseL * randFloat(0.9, 1.3));
      range(nLessons).forEach((i) => {
        const category = categories[rand(0, categories.length - 1)];
        const country = countries[rand(0, countries.length - 1)];
        const level = levels[rand(0, levels.length - 1)];
        const priceBase =
          category === "Coding"
            ? randFloat(30, 60)
            : category === "Science"
            ? randFloat(20, 50)
            : category === "Math"
            ? randFloat(18, 40)
            : randFloat(12, 35);
        const price = parseFloat(priceBase.toFixed(2));
        const currency = currencies[rand(0, currencies.length - 1)];
        const dt = new Date(now);
        dt.setMonth(now.getMonth() - (11 - idx));
        dt.setDate(rand(1, 28));
        const isTrial = Math.random() < 0.18;
        lessons.push({
          id: `M${idx}-L${i}`,
          month: mm.month,
          dateISO: dt.toISOString(),
          category,
          country,
          level,
          price,
          currency,
          isTrial,
          studentId: `s${rand(1, 1200)}`,
          tutorId: `t${rand(1, 500)}`,
        });
      });
    });

    // Apply best-effort filters on mock dataset
    lessons = lessons.filter((l) => {
      let ok = true;
      if (from && new Date(l.dateISO) < new Date(from)) ok = false;
      if (to && new Date(l.dateISO) > new Date(to)) ok = false;
      if (filterCountry && !l.country.toLowerCase().includes(filterCountry)) ok = false;
      if (filterCategory && !l.category.toLowerCase().includes(filterCategory)) ok = false;
      if (filterLevel && !l.level.toLowerCase().includes(filterLevel)) ok = false;
      return ok;
    });

    // Funnel: recompute from filtered lessons (approximate)
    const monthsInFilter = new Set(lessons.map((l) => l.month));
    const monthlyFiltered = monthly.filter((m) => (monthsInFilter.size ? monthsInFilter.has(m.month) : true));
    const funnel = [
      {
        stage: "Signups",
        value: monthlyFiltered.reduce((a, b) => a + b.signups, 0),
      },
      {
        stage: "First Lesson",
        value: monthlyFiltered.reduce((a, b) => a + b.firstBookings, 0),
      },
      {
        stage: "Repeat Students",
        value: monthlyFiltered.reduce((a, b) => a + b.repeatBookings, 0),
      },
    ];

    // Lessons by Category
    const byCategoryMap = new Map();
    lessons.forEach((l) => {
      byCategoryMap.set(l.category, (byCategoryMap.get(l.category) || 0) + 1);
    });
    const lessonsByCategory = Array.from(byCategoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    // Lessons by Country
    const byCountryMap = new Map();
    lessons.forEach((l) => {
      byCountryMap.set(l.country, (byCountryMap.get(l.country) || 0) + 1);
    });
    const lessonsByCountry = Array.from(byCountryMap.entries()).map(([country, count]) => ({ country, count }));

    // Revenue by Category
    const revenueByCategoryMap = new Map();
    lessons.forEach((l) => {
      const key = l.category;
      revenueByCategoryMap.set(key, (revenueByCategoryMap.get(key) || 0) + (l.isTrial ? 0 : l.price));
    });
    const revenueByCategory = Array.from(revenueByCategoryMap.entries()).map(([category, revenue]) => ({
      category,
      revenue: parseFloat(revenue.toFixed(2)),
    }));

    // Monthly breakdown for funnel (already have monthly), keep as-is but filtered to monthsInFilter if filters present
    const monthlyFunnel = monthly
      .filter((m) => (monthsInFilter.size ? monthsInFilter.has(m.month) : true))
      .map((m) => ({
        month: m.month,
        signups: m.signups,
        firstBookings: m.firstBookings,
        repeatBookings: m.repeatBookings,
      }));

    // Country × Level pivot (counts of lessons) — uses the single 'levels' defined above
    const pivotMap = new Map(); // country -> { level -> count }
    lessons.forEach((l) => {
      if (!pivotMap.has(l.country)) pivotMap.set(l.country, new Map());
      const row = pivotMap.get(l.country);
      row.set(l.level, (row.get(l.level) || 0) + 1);
    });
    const countryLevelPivot = Array.from(pivotMap.entries()).map(([country, row]) => {
      const rec = { country };
      levels.forEach((lv) => (rec[lv] = row.get(lv) || 0));
      return rec;
    });

    // Top-priced lessons (10 highest)
    const topPricedLessons = [...lessons]
      .filter((l) => !l.isTrial)
      .sort((a, b) => b.price - a.price)
      .slice(0, 10)
      .map((l) => ({
        lessonId: l.id,
        month: l.month,
        category: l.category,
        price: l.price,
        currency: l.currency,
        studentCountry: l.country,
        level: l.level,
      }));

    // Category heatmap (category × month) with lessons & revenue
    const heatKey = (cat, m) => `${cat}__${m}`;
    const heatMap = new Map();
    lessons.forEach((l) => {
      const key = heatKey(l.category, l.month);
      const v = heatMap.get(key) || { category: l.category, month: l.month, lessons: 0, revenue: 0 };
      v.lessons += 1;
      v.revenue += l.isTrial ? 0 : l.price;
      heatMap.set(key, v);
    });
    const categoryHeatmap = Array.from(heatMap.values()).map((v) => ({
      ...v,
      revenue: parseFloat(v.revenue.toFixed(2)),
    }));

    // Per-student lifecycle distribution
    const lessonsPerStudent = new Map();
    lessons.forEach((l) => {
      lessonsPerStudent.set(l.studentId, (lessonsPerStudent.get(l.studentId) || 0) + 1);
    });
    const distMap = new Map(); // lessonsCount -> number of students
    lessonsPerStudent.forEach((cnt) => {
      // bucket >10 into "11+"
      const bucket = cnt >= 11 ? "11+" : String(cnt);
      distMap.set(bucket, (distMap.get(bucket) || 0) + 1);
    });
    const studentLifecycleDist = Array.from(distMap.entries())
      .sort((a, b) => {
        const na = a[0] === "11+" ? 11 : parseInt(a[0], 10);
        const nb = b[0] === "11+" ? 11 : parseInt(b[0], 10);
        return na - nb;
      })
      .map(([lessonsCount, students]) => ({ lessonsCount, students }));

    // Average lessons before leaving (approx via distribution)
    const totalStudents = Array.from(distMap.values()).reduce((a, b) => a + b, 0) || 1;
    const avgLessonsBeforeLeave = studentLifecycleDist
      .filter((r) => r.lessonsCount !== "11+")
      .map((r) => ({ lessons: Number(r.lessonsCount), percent: Math.round((r.students / totalStudents) * 100) }));

    // --- Avg Price by Country ---
    const avgPriceByCountryMap = new Map();
    lessons.forEach((l) => {
      if (l.isTrial) return; // ignore trials for price
      const cur = avgPriceByCountryMap.get(l.country) || { sum: 0, n: 0 };
      cur.sum += l.price;
      cur.n += 1;
      avgPriceByCountryMap.set(l.country, cur);
    });
    const avgPriceByCountry = Array.from(avgPriceByCountryMap.entries()).map(([country, { sum, n }]) => ({
      country,
      avgPrice: +(sum / Math.max(1, n)).toFixed(2),
    }));

    // --- Avg Price by Category ---
    const avgPriceByCategoryMap = new Map();
    lessons.forEach((l) => {
      if (l.isTrial) return; // ignore trials for price
      const cur = avgPriceByCategoryMap.get(l.category) || { sum: 0, n: 0 };
      cur.sum += l.price;
      cur.n += 1;
      avgPriceByCategoryMap.set(l.category, cur);
    });
    const avgPriceByCategory = Array.from(avgPriceByCategoryMap.entries()).map(([category, { sum, n }]) => ({
      category,
      avgPrice: +(sum / Math.max(1, n)).toFixed(2),
    }));

    return {
      funnel,
      lessonsByCategory,
      lessonsByCountry,
      revenueByCategory,
      monthlyFunnel,
      cohortRetention: buildMockCohorts(months),
      countryLevelPivot,
      topPricedLessons,
      categoryHeatmap,
      studentLifecycleDist,
      avgLessonsBeforeLeave,
      avgPriceByCountry, // kept
      avgPriceByCategory, // new
    };
  }
}

/* Build a simple cohort retention mock: each cohort is a month with survival over next 6 months */
function buildMockCohorts(months) {
  // rows like: { cohort: '2025-01', m0:100, m1:72, m2:58, m3:45, m4:36, m5:30 }
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function decay(n) {
    const out = [n];
    let current = n;
    for (let i = 1; i <= 6; i++) {
      current = Math.max(0, Math.floor(current * (0.6 + Math.random() * 0.15)));
      out.push(current);
    }
    return out;
  }
  const cohorts = months.slice(-8).map((m) => monthKey(m));
  return cohorts.map((ck) => {
    const base = rand(80, 300);
    const arr = decay(base); // 7 points m0..m6
    return { cohort: ck, m0: arr[0], m1: arr[1], m2: arr[2], m3: arr[3], m4: arr[4], m5: arr[5], m6: arr[6] };
  });
}

/* =========================
   Component
========================= */
export default function ConversionFunnel() {
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
    const res = await safeFetchJSON(`${API}/api/admin/conversion-funnel?${params.toString()}`);
    setData(res);
    setLoading(false);
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setCountry("");
    setCategory("");
    setLevel("");
  }

  // CSV exporters (per section)
  function exportFunnelCSV() {
    const rows = [["Stage", "Value"], ...(data?.funnel || []).map((x) => [x.stage, x.value])];
    csvDownload(`funnel_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportMonthlyCSV() {
    const rows = [
      ["Month", "Signups", "FirstBookings", "RepeatBookings"],
      ...(data?.monthlyFunnel || []).map((x) => [x.month, x.signups, x.firstBookings, x.repeatBookings]),
    ];
    csvDownload(`monthly_funnel_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportLessonsByCategoryCSV() {
    const rows = [["Category", "Count"], ...(data?.lessonsByCategory || []).map((x) => [x.category, x.count])];
    csvDownload(`lessons_by_category_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportLessonsByCountryCSV() {
    const rows = [["Country", "Count"], ...(data?.lessonsByCountry || []).map((x) => [x.country, x.count])];
    csvDownload(`lessons_by_country_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportRevenueByCategoryCSV() {
    const rows = [["Category", "Revenue"], ...(data?.revenueByCategory || []).map((x) => [x.category, x.revenue])];
    csvDownload(`revenue_by_category_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportCohortCSV() {
    const rows = [
      ["Cohort", "m0", "m1", "m2", "m3", "m4", "m5", "m6"],
      ...(data?.cohortRetention || []).map((x) => [x.cohort, x.m0, x.m1, x.m2, x.m3, x.m4, x.m5, x.m6]),
    ];
    csvDownload(`cohort_retention_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportCountryLevelPivotCSV() {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const rows = [
      ["Country", ...levels],
      ...(data?.countryLevelPivot || []).map((r) => [r.country, ...levels.map((lv) => r[lv] ?? 0)]),
    ];
    csvDownload(`country_level_pivot_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportTopPricedCSV() {
    const rows = [
      ["LessonId", "Month", "Category", "Price", "Currency", "StudentCountry", "Level"],
      ...(data?.topPricedLessons || []).map((x) => [
        x.lessonId,
        x.month,
        x.category,
        x.price,
        x.currency,
        x.studentCountry,
        x.level,
      ]),
    ];
    csvDownload(`top_priced_lessons_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportCategoryHeatmapCSV() {
    const rows = [
      ["Category", "Month", "Lessons", "Revenue"],
      ...(data?.categoryHeatmap || []).map((x) => [x.category, x.month, x.lessons, x.revenue]),
    ];
    csvDownload(`category_heatmap_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportLifecycleCSV() {
    const rows = [
      ["LessonsCount", "Students"],
      ...(data?.studentLifecycleDist || []).map((x) => [x.lessonsCount, x.students]),
    ];
    csvDownload(`student_lifecycle_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportAvgBeforeLeaveCSV() {
    const rows = [
      ["Lessons", "Percent"],
      ...(data?.avgLessonsBeforeLeave || []).map((x) => [x.lessons, x.percent]),
    ];
    csvDownload(`avg_lessons_before_leave_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportAvgPriceByCountryCSV() {
    const rows = [["Country", "AvgPrice"], ...(data?.avgPriceByCountry || []).map((x) => [x.country, x.avgPrice])];
    csvDownload(`avg_price_by_country_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportAvgPriceByCategoryCSV() {
    const rows = [["Category", "AvgPrice"], ...(data?.avgPriceByCategory || []).map((x) => [x.category, x.avgPrice])];
    csvDownload(`avg_price_by_category_${fmtDateISO(new Date())}.csv`, rows);
  }

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 space-y-2">
        <h2 className="font-bold mb-2">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border px-2 py-1 rounded" />
          <input
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input
            placeholder="Level (A1…C2)"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={load} className="px-3 py-1 border rounded">
            Apply
          </button>
          <button onClick={clearFilters} className="px-3 py-1 border rounded">
            Clear
          </button>
          <button
            onClick={() => {
              exportFunnelCSV();
              exportMonthlyCSV();
              exportLessonsByCategoryCSV();
              exportLessonsByCountryCSV();
              exportRevenueByCategoryCSV();
              exportCohortCSV();
              exportCountryLevelPivotCSV();
              exportTopPricedCSV();
              exportCategoryHeatmapCSV();
              exportLifecycleCSV();
              exportAvgBeforeLeaveCSV();
              exportAvgPriceByCountryCSV();
              exportAvgPriceByCategoryCSV();
            }}
            className="px-3 py-1 border rounded"
          >
            Export All CSVs
          </button>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Conversion Funnel</h3>
          <button onClick={exportFunnelCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.funnel && data.funnel.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <ReTooltip />
                <Funnel dataKey="value" data={data.funnel} isAnimationActive>
                  <LabelList position="right" fill="#111" stroke="none" dataKey="stage" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No funnel data.</div>
        )}
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Monthly Breakdown</h3>
          <button onClick={exportMonthlyCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.monthlyFunnel && data.monthlyFunnel.length ? (
          <div className="w-full" style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyFunnel} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="signups" stroke="#8884d8" name="Signups" />
                <Line type="monotone" dataKey="firstBookings" stroke="#82ca9d" name="First Bookings" />
                <Line type="monotone" dataKey="repeatBookings" stroke="#ff7300" name="Repeat Students" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No monthly data.</div>
        )}
      </div>

      {/* Lessons by Category */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Lessons by Category</h3>
          <button onClick={exportLessonsByCategoryCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.lessonsByCategory && data.lessonsByCategory.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.lessonsByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="count" name="Lessons" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No category data.</div>
        )}
      </div>

      {/* Lessons by Country */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Lessons by Country</h3>
          <button onClick={exportLessonsByCountryCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.lessonsByCountry && data.lessonsByCountry.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.lessonsByCountry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="count" name="Lessons" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No country data.</div>
        )}
      </div>

      {/* Revenue by Category */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Revenue by Category</h3>
          <button onClick={exportRevenueByCategoryCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.revenueByCategory && data.revenueByCategory.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="revenue" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No revenue data.</div>
        )}
      </div>

      {/* Avg Price by Category (NEW) */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Avg Lesson Price by Category</h3>
          <button onClick={exportAvgPriceByCategoryCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.avgPriceByCategory && data.avgPriceByCategory.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.avgPriceByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="avgPrice" name="Avg Price" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No data.</div>
        )}
      </div>

      {/* Avg Price by Country (KEPT) */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Avg Lesson Price by Country</h3>
          <button onClick={exportAvgPriceByCountryCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.avgPriceByCountry && data.avgPriceByCountry.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.avgPriceByCountry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="avgPrice" name="Avg Price" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No data.</div>
        )}
      </div>

      {/* Cohort Retention */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Cohort Retention (m0…m6)</h3>
          <button onClick={exportCohortCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.cohortRetention && data.cohortRetention.length ? (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">Cohort</th>
                <th className="px-3 py-2 border">m0</th>
                <th className="px-3 py-2 border">m1</th>
                <th className="px-3 py-2 border">m2</th>
                <th className="px-3 py-2 border">m3</th>
                <th className="px-3 py-2 border">m4</th>
                <th className="px-3 py-2 border">m5</th>
                <th className="px-3 py-2 border">m6</th>
              </tr>
            </thead>
            <tbody>
              {data.cohortRetention.map((r) => (
                <tr key={r.cohort}>
                  <td className="px-3 py-2 border">{r.cohort}</td>
                  <td className="px-3 py-2 border">{r.m0}</td>
                  <td className="px-3 py-2 border">{r.m1}</td>
                  <td className="px-3 py-2 border">{r.m2}</td>
                  <td className="px-3 py-2 border">{r.m3}</td>
                  <td className="px-3 py-2 border">{r.m4}</td>
                  <td className="px-3 py-2 border">{r.m5}</td>
                  <td className="px-3 py-2 border">{r.m6}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500">No cohort data.</div>
        )}
      </div>

      {/* Country × Level Pivot */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Country × Level (lesson counts)</h3>
          <button onClick={exportCountryLevelPivotCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.countryLevelPivot && data.countryLevelPivot.length ? (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">Country</th>
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => (
                  <th key={lv} className="px-3 py-2 border">
                    {lv}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.countryLevelPivot.map((r) => (
                <tr key={r.country}>
                  <td className="px-3 py-2 border">{r.country}</td>
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => (
                    <td key={lv} className="px-3 py-2 border text-center">
                      {r[lv] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500">No pivot data.</div>
        )}
      </div>

      {/* Top-priced lessons */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Top-Priced Lessons (10)</h3>
          <button onClick={exportTopPricedCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.topPricedLessons && data.topPricedLessons.length ? (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">Lesson ID</th>
                <th className="px-3 py-2 border">Month</th>
                <th className="px-3 py-2 border">Category</th>
                <th className="px-3 py-2 border">Level</th>
                <th className="px-3 py-2 border">Price</th>
                <th className="px-3 py-2 border">Currency</th>
                <th className="px-3 py-2 border">Student Country</th>
              </tr>
            </thead>
            <tbody>
              {data.topPricedLessons.map((r) => (
                <tr key={r.lessonId}>
                  <td className="px-3 py-2 border">{r.lessonId}</td>
                  <td className="px-3 py-2 border">{r.month}</td>
                  <td className="px-3 py-2 border">{r.category}</td>
                  <td className="px-3 py-2 border">{r.level}</td>
                  <td className="px-3 py-2 border">{r.price}</td>
                  <td className="px-3 py-2 border">{r.currency}</td>
                  <td className="px-3 py-2 border">{r.studentCountry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500">No top-priced data.</div>
        )}
      </div>

      {/* Category heatmap: Lessons per Month */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Category Heatmap — Lessons per Month</h3>
          <button onClick={exportCategoryHeatmapCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.categoryHeatmap && data.categoryHeatmap.length ? (
          <div className="w-full" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aggregateHeatmapByMonth(data.categoryHeatmap, "lessons")}
                margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                {extractCategories(data.categoryHeatmap).map((cat) => (
                  <Bar key={cat} dataKey={cat} stackId="a" name={cat} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No heatmap data.</div>
        )}
      </div>

      {/* Category heatmap: Revenue per Month */}
      <div className="bg-white border rounded-2xl p-4">
        <h3 className="font-bold mb-2">Category Heatmap — Revenue per Month</h3>
        {data?.categoryHeatmap && data.categoryHeatmap.length ? (
          <div className="w-full" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aggregateHeatmapByMonth(data.categoryHeatmap, "revenue")}
                margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                {extractCategories(data.categoryHeatmap).map((cat) => (
                  <Bar key={cat} dataKey={cat} stackId="b" name={cat} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No heatmap data.</div>
        )}
      </div>

      {/* Student lifecycle distribution */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Per-Student Lifecycle (lessons count → #students)</h3>
          <button onClick={exportLifecycleCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.studentLifecycleDist && data.studentLifecycleDist.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.studentLifecycleDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lessonsCount" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="students" name="# Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No lifecycle data.</div>
        )}
      </div>

      {/* Avg lessons before leaving */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Avg Lessons Before Leaving (distribution %)</h3>
          <button onClick={exportAvgBeforeLeaveCSV} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
        {data?.avgLessonsBeforeLeave && data.avgLessonsBeforeLeave.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.avgLessonsBeforeLeave}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lessons" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="percent" name="% of Students" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No statistics yet.</div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Helpers for Heatmap aggregation
========================= */
function extractCategories(heat) {
  const set = new Set();
  heat.forEach((r) => set.add(r.category));
  return Array.from(set);
}
function extractMonths(heat) {
  const set = new Set();
  heat.forEach((r) => set.add(r.month));
  return Array.from(set).sort();
}
function aggregateHeatmapByMonth(heat, metric /* 'lessons' | 'revenue' */) {
  const cats = extractCategories(heat);
  const months = extractMonths(heat);
  return months.map((m) => {
    const row = { month: m };
    cats.forEach((c) => (row[c] = 0));
    heat
      .filter((r) => r.month === m)
      .forEach((r) => {
        row[r.category] += r[metric] || 0;
      });
    return row;
  });
}
