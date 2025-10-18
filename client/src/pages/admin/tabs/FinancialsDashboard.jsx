// client/src/pages/admin/tabs/FinancialsDashboard.jsx
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
    const currencies = ["EUR", "USD", "GBP"];
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

    // Synthetic student/tutor pools for ARPU / revenue-per-tutor
    const students = range(2200).map((i) => `s${i + 1}`);
    const tutors = range(900).map((i) => `t${i + 1}`);

    // Build lesson dataset with prices & commissions
    let lessons = [];
    months.forEach((mObj, idx) => {
      const month = monthKey(mObj);
      const n = rand(700, 1800);
      range(n).forEach((i) => {
        const category = categories[rand(0, categories.length - 1)];
        const country = countries[rand(0, countries.length - 1)];
        const level = levels[rand(0, levels.length - 1)];
        const currency = currencies[rand(0, currencies.length - 1)];
        const isTrial = Math.random() < 0.2;
        const priceBase =
          category === "Coding" ? randFloat(30, 60) :
          category === "Science" ? randFloat(22, 52) :
          category === "Math" ? randFloat(18, 42) :
          randFloat(12, 35);
        const price = isTrial ? 0 : parseFloat(priceBase.toFixed(2));
        const commissionPct = randFloat(10, 18); // platform cut %
        const commissionAmount = +(price * (commissionPct / 100)).toFixed(2);
        const refundRoll = Math.random();
        const refunded = !isTrial && refundRoll < 0.05;
        const chargeback = !isTrial && !refunded && Math.random() < 0.01;

        const dt = new Date(now);
        dt.setMonth(now.getMonth() - (11 - idx));
        dt.setDate(rand(1, 28));
        dt.setHours(rand(6, 22), rand(0, 59), 0, 0);

        const studentId = students[rand(0, students.length - 1)];
        const tutorId = tutors[rand(0, tutors.length - 1)];

        lessons.push({
          id: `F-${idx}-${i}`,
          month,
          dateISO: dt.toISOString(),
          category,
          country,
          level,
          currency,
          isTrial,
          price,
          commissionPct,
          commissionAmount,
          refunded,
          chargeback,
          studentId,
          tutorId,
        });
      });
    });

    // Apply filters
    lessons = lessons.filter((l) => {
      let ok = true;
      if (from && new Date(l.dateISO) < new Date(from)) ok = false;
      if (to && new Date(l.dateISO) > new Date(to)) ok = false;
      if (filterCountry && !l.country.toLowerCase().includes(filterCountry)) ok = false;
      if (filterCategory && !l.category.toLowerCase().includes(filterCategory)) ok = false;
      if (filterLevel && !l.level.toLowerCase().includes(filterLevel)) ok = false;
      return ok;
    });

    // Helper aggregations
    const byMonth = new Map(); // month -> { revenue, students:Set, tutors:Set, commissions, refunds, chargebacks, lessons }
    lessons.forEach((l) => {
      const rec =
        byMonth.get(l.month) || {
          revenue: 0,
          commissions: 0,
          refunds: { count: 0, amount: 0 },
          chargebacks: { count: 0, amount: 0 },
          students: new Set(),
          tutors: new Set(),
          lessons: 0,
        };
      if (!l.isTrial) {
        rec.revenue += l.price;
        rec.commissions += l.commissionAmount;
        if (l.refunded) {
          rec.refunds.count += 1;
          rec.refunds.amount += l.price;
        }
        if (l.chargeback) {
          rec.chargebacks.count += 1;
          rec.chargebacks.amount += l.price;
        }
      }
      rec.students.add(l.studentId);
      rec.tutors.add(l.tutorId);
      rec.lessons += 1;
      byMonth.set(l.month, rec);
    });

    // Revenue by Category / Country
    const revByCategory = new Map();
    const revByCountry = new Map();
    lessons.forEach((l) => {
      if (l.isTrial) return;
      revByCategory.set(l.category, (revByCategory.get(l.category) || 0) + l.price);
      revByCountry.set(l.country, (revByCountry.get(l.country) || 0) + l.price);
    });
    const revenueByCategory = Array.from(revByCategory.entries())
      .map(([category, revenue]) => ({ category, revenue: +revenue.toFixed(2) }))
      .sort((a, b) => b.revenue - a.revenue);
    const revenueByCountry = Array.from(revByCountry.entries())
      .map(([country, revenue]) => ({ country, revenue: +revenue.toFixed(2) }))
      .sort((a, b) => b.revenue - a.revenue);

    // ARPU trend (per active student)
    const arpuTrend = Array.from(byMonth.entries())
      .map(([month, v]) => ({
        month,
        arpu: v.students.size ? +(v.revenue / v.students.size).toFixed(2) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Revenue per active tutor (trend)
    const revenuePerTutorTrend = Array.from(byMonth.entries())
      .map(([month, v]) => ({
        month,
        revenuePerTutor: v.tutors.size ? +(v.revenue / v.tutors.size).toFixed(2) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top earning tutors / top spending students
    const tutorRevenue = new Map();
    const studentSpend = new Map();
    lessons.forEach((l) => {
      if (l.isTrial) return;
      tutorRevenue.set(l.tutorId, (tutorRevenue.get(l.tutorId) || 0) + l.price);
      studentSpend.set(l.studentId, (studentSpend.get(l.studentId) || 0) + l.price);
    });
    const topTutors = Array.from(tutorRevenue.entries())
      .map(([tutorId, revenue]) => ({ tutorId, name: `Tutor ${tutorId.slice(1)}`, revenue: +revenue.toFixed(2) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const topStudents = Array.from(studentSpend.entries())
      .map(([studentId, spend]) => ({ studentId, name: `Student ${studentId.slice(1)}`, spend: +spend.toFixed(2) }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

    // Avg price by category
    const avgCat = new Map(); // cat -> {sum,n}
    lessons.forEach((l) => {
      if (l.isTrial) return;
      const cur = avgCat.get(l.category) || { sum: 0, n: 0 };
      cur.sum += l.price;
      cur.n += 1;
      avgCat.set(l.category, cur);
    });
    const avgPriceByCategory = Array.from(avgCat.entries()).map(([category, { sum, n }]) => ({
      category,
      avgPrice: +(sum / Math.max(1, n)).toFixed(2),
    }));

    // Commission trend (average % per month)
    const commissionTrend = Array.from(byMonth.entries())
      .map(([month, v]) => {
        // average commission % approximated: commissions / revenue * 100
        const pct = v.revenue ? +((v.commissions / v.revenue) * 100).toFixed(2) : 0;
        return { month, commissionPct: pct };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Refund / Chargeback rate trends (by month, % of paid lessons)
    const refundRateTrend = Array.from(byMonth.entries())
      .map(([month, v]) => {
        const paidLessons = v.lessons - Math.round(v.lessons * 0.2); // approx remove trials
        const rate = paidLessons ? +((v.refunds.count / paidLessons) * 100).toFixed(2) : 0;
        return { month, rate };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
    const chargebackRateTrend = Array.from(byMonth.entries())
      .map(([month, v]) => {
        const paidLessons = v.lessons - Math.round(v.lessons * 0.2);
        const rate = paidLessons ? +((v.chargebacks.count / paidLessons) * 100).toFixed(2) : 0;
        return { month, rate };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      revenueByCategory,
      revenueByCountry,
      arpuTrend,
      revenuePerTutorTrend,
      topTutors,
      topStudents,
      avgPriceByCategory,
      commissionTrend,
      refundRateTrend,
      chargebackRateTrend,
    };
  }
}

/* =========================
   Component
========================= */
export default function FinancialsDashboard() {
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
    const res = await safeFetchJSON(`${API}/api/admin/metrics/financials?${params.toString()}`);
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
  function exportRevenueByCategoryCSV() {
    const rows = [["Category", "Revenue"], ...(data?.revenueByCategory || []).map((x) => [x.category, x.revenue])];
    csvDownload(`financials_revenue_by_category_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportRevenueByCountryCSV() {
    const rows = [["Country", "Revenue"], ...(data?.revenueByCountry || []).map((x) => [x.country, x.revenue])];
    csvDownload(`financials_revenue_by_country_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportArpuTrendCSV() {
    const rows = [["Month", "ARPU"], ...(data?.arpuTrend || []).map((x) => [x.month, x.arpu])];
    csvDownload(`financials_arpu_trend_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportRevenuePerTutorCSV() {
    const rows = [["Month", "RevenuePerTutor"], ...(data?.revenuePerTutorTrend || []).map((x) => [x.month, x.revenuePerTutor])];
    csvDownload(`financials_revenue_per_tutor_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportTopTutorsCSV() {
    const rows = [["TutorId", "Name", "Revenue"], ...(data?.topTutors || []).map((x) => [x.tutorId, x.name, x.revenue])];
    csvDownload(`financials_top_tutors_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportTopStudentsCSV() {
    const rows = [["StudentId", "Name", "Spend"], ...(data?.topStudents || []).map((x) => [x.studentId, x.name, x.spend])];
    csvDownload(`financials_top_students_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportAvgPriceByCategoryCSV() {
    const rows = [["Category", "AvgPrice"], ...(data?.avgPriceByCategory || []).map((x) => [x.category, x.avgPrice])];
    csvDownload(`financials_avg_price_by_category_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportCommissionTrendCSV() {
    const rows = [["Month", "CommissionPct"], ...(data?.commissionTrend || []).map((x) => [x.month, x.commissionPct])];
    csvDownload(`financials_commission_trend_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportRefundRateTrendCSV() {
    const rows = [["Month", "RefundRatePct"], ...(data?.refundRateTrend || []).map((x) => [x.month, x.rate])];
    csvDownload(`financials_refund_rate_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportChargebackRateTrendCSV() {
    const rows = [["Month", "ChargebackRatePct"], ...(data?.chargebackRateTrend || []).map((x) => [x.month, x.rate])];
    csvDownload(`financials_chargeback_rate_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportAllCSVs() {
    exportRevenueByCategoryCSV();
    exportRevenueByCountryCSV();
    exportArpuTrendCSV();
    exportRevenuePerTutorCSV();
    exportTopTutorsCSV();
    exportTopStudentsCSV();
    exportAvgPriceByCategoryCSV();
    exportCommissionTrendCSV();
    exportRefundRateTrendCSV();
    exportChargebackRateTrendCSV();
  }

  if (loading) return <div className="p-4">Loading…</div>;

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

      {/* Revenue by Category */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Revenue by Category</h3>
          <button onClick={exportRevenueByCategoryCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.revenueByCategory?.length ? (
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
        ) : <div className="text-gray-500">No category revenue.</div>}
      </div>

      {/* Revenue by Country */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Revenue by Country</h3>
          <button onClick={exportRevenueByCountryCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.revenueByCountry?.length ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByCountry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="revenue" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No country revenue.</div>}
      </div>

      {/* ARPU Trend */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">ARPU Trend (per Active Student)</h3>
          <button onClick={exportArpuTrendCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.arpuTrend?.length ? (
          <div className="w-full" style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.arpuTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="arpu" name="ARPU" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No ARPU data.</div>}
      </div>

      {/* Revenue per Active Tutor */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Revenue per Active Tutor</h3>
          <button onClick={exportRevenuePerTutorCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.revenuePerTutorTrend?.length ? (
          <div className="w-full" style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenuePerTutorTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="revenuePerTutor" name="Revenue per Tutor" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No tutor revenue data.</div>}
      </div>

      {/* Top 10 Tutors / Students */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Top Earning Tutors</h3>
          <button onClick={exportTopTutorsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.topTutors?.length ? (
          <table className="min-w-full text-sm border mt-2">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">Tutor ID</th>
                <th className="px-3 py-2 border">Name</th>
                <th className="px-3 py-2 border">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topTutors.map((r) => (
                <tr key={r.tutorId}>
                  <td className="px-3 py-2 border">{r.tutorId}</td>
                  <td className="px-3 py-2 border">{r.name}</td>
                  <td className="px-3 py-2 border">{r.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-gray-500 mt-2">No top tutors.</div>}
      </div>

      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Top Spending Students</h3>
          <button onClick={exportTopStudentsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.topStudents?.length ? (
          <table className="min-w-full text-sm border mt-2">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">Student ID</th>
                <th className="px-3 py-2 border">Name</th>
                <th className="px-3 py-2 border">Spend</th>
              </tr>
            </thead>
            <tbody>
              {data.topStudents.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-3 py-2 border">{r.studentId}</td>
                  <td className="px-3 py-2 border">{r.name}</td>
                  <td className="px-3 py-2 border">{r.spend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-gray-500 mt-2">No top students.</div>}
      </div>

      {/* Avg Price by Category */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Average Lesson Price by Category</h3>
          <button onClick={exportAvgPriceByCategoryCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.avgPriceByCategory?.length ? (
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
        ) : <div className="text-gray-500">No price data.</div>}
      </div>

      {/* Commission Trend */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Platform Commission (Average %)</h3>
          <button onClick={exportCommissionTrendCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.commissionTrend?.length ? (
          <div className="w-full" style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.commissionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="commissionPct" name="Commission (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No commission data.</div>}
      </div>

      {/* Refund & Chargeback Rates */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Refund & Chargeback Rates</h3>
          <div className="flex gap-2">
            <button onClick={exportRefundRateTrendCSV} className="px-3 py-1 border rounded">Export Refund CSV</button>
            <button onClick={exportChargebackRateTrendCSV} className="px-3 py-1 border rounded">Export Chargeback CSV</button>
          </div>
        </div>
        {(data?.refundRateTrend?.length || data?.chargebackRateTrend?.length) ? (
          <div className="w-full" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mergeLinesOnMonth(data?.refundRateTrend || [], data?.chargebackRateTrend || [], "rate", "refundRate", "chargebackRate")}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="refundRate" name="Refund Rate (%)" />
                <Line type="monotone" dataKey="chargebackRate" name="Chargeback Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No risk trends data.</div>}
      </div>
    </div>
  );
}

/* =========================
   Helpers
========================= */
function mergeLinesOnMonth(a, b, srcKey, aKey, bKey) {
  const map = new Map();
  a.forEach((r) => map.set(r.month, { month: r.month, [aKey]: r[srcKey] }));
  b.forEach((r) => {
    const cur = map.get(r.month) || { month: r.month };
    cur[bKey] = r[srcKey];
    map.set(r.month, cur);
  });
  return Array.from(map.values()).sort((x, y) => x.month.localeCompare(y.month));
}
