// client/src/pages/admin/tabs/GrowthDashboard.jsx
// =====================================================================================================================
// LERNITT — ADMIN GROWTH DASHBOARD (MOCK+REAL READY, SELF-CONTAINED)
// Aligns with the agreed data contract and the /api/admin/metrics/growth endpoint.
// Sections:
// • Funnel (Signups → First → Repeat)
// • Time-to-first-booking (histogram)
// • Monthly new/returning students
// • Monthly new/active tutors
// • Conversion by country
// • Conversion by source (table; shown if provided)
// =====================================================================================================================

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------
function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function monthKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function lastNMonths(n = 12) {
  const arr = [];
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(base.getMonth() - i);
    arr.push(monthKey(d));
  }
  return arr;
}

function downloadCSV(rows, filename = "export.csv") {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Section({ title, actions, children }) {
  return (
    <div className="border rounded-2xl bg-white p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

async function safeFetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("safeFetchJSON fallback:", e?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------------------------------------------------
export default function GrowthDashboard() {
  // Filters
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [source, setSource] = useState("");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    funnel: [],
    timeToFirstBooking: [],
    monthlyStudents: [],
    monthlyTutors: [],
    conversionByCountry: [],
    conversionBySource: [],
  });

  // Build query string
  const query = useMemo(() => {
    const usp = new URLSearchParams();
    if (from) usp.set("from", from);
    if (to) usp.set("to", to);
    if (country) usp.set("country", country);
    if (category) usp.set("category", category);
    if (level) usp.set("level", level);
    if (source) usp.set("source", source);
    return usp.toString() ? `?${usp.toString()}` : "";
  }, [from, to, country, category, level, source]);

  // Fetch data (mock fallback if null)
  useEffect(() => {
    let stop = false;
    async function run() {
      setLoading(true);
      const url = `/api/admin/metrics/growth${query}`;
      let res = await safeFetchJSON(url);
      if (!res) {
        // Mock fallback (safe defaults)
        res = {
          funnel: [
            { stage: "Signups", value: 500 },
            { stage: "First Booking", value: 300 },
            { stage: "Repeat", value: 180 },
          ],
          timeToFirstBooking: [
            { days: 1, users: 50 },
            { days: 3, users: 80 },
            { days: 7, users: 120 },
            { days: 14, users: 30 },
          ],
          monthlyStudents: lastNMonths(6).map((m, i) => ({
            month: m,
            new: 20 + i * 5,
            returning: 50 + i * 3,
          })),
          monthlyTutors: lastNMonths(6).map((m, i) => ({
            month: m,
            new: 5 + i,
            active: 20 + i * 2,
          })),
          conversionByCountry: [
            { country: "Spain", rate: 42, signups: 300 },
            { country: "France", rate: 38, signups: 250 },
            { country: "USA", rate: 55, signups: 400 },
          ],
          conversionBySource: [
            { source: "Google Ads", signups: 120, firstBookings: 60, rate: 50 },
            { source: "Organic", signups: 180, firstBookings: 90, rate: 50 },
          ],
        };
      }
      if (!stop && res) setData(res);
      setLoading(false);
    }
    run();
    return () => {
      stop = true;
    };
  }, [query]);

  // CSV exports
  function exportFunnel() {
    downloadCSV(data.funnel || [], "growth_funnel.csv");
  }
  function exportTTFB() {
    downloadCSV(data.timeToFirstBooking || [], "growth_time_to_first_booking.csv");
  }
  function exportMonthlyStudents() {
    downloadCSV(data.monthlyStudents || [], "growth_monthly_students.csv");
  }
  function exportMonthlyTutors() {
    downloadCSV(data.monthlyTutors || [], "growth_monthly_tutors.csv");
  }
  function exportCountryConv() {
    downloadCSV(data.conversionByCountry || [], "growth_conversion_by_country.csv");
  }
  function exportSourceConv() {
    downloadCSV(data.conversionBySource || [], "growth_conversion_by_source.csv");
  }
  function exportAll() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            filters: { from, to, country, category, level, source },
            ...data,
          },
          null,
          2
        ),
      ],
      { type: "application/json;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "growth_dashboard_all.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Derived
  const ttfbBins = useMemo(() => {
    const arr = (data.timeToFirstBooking || []).slice().sort((a, b) => a.days - b.days);
    return arr.map((x) => ({ bin: String(x.days), users: x.users }));
  }, [data.timeToFirstBooking]);

  const studentsMonthly = useMemo(
    () =>
      (data.monthlyStudents || []).map((x) => ({
        month: x.month,
        new: x.new,
        returning: x.returning,
      })),
    [data.monthlyStudents]
  );

  const tutorsMonthly = useMemo(
    () =>
      (data.monthlyTutors || []).map((x) => ({
        month: x.month,
        new: x.new,
        active: x.active,
      })),
    [data.monthlyTutors]
  );

  const convByCountry = useMemo(
    () =>
      (data.conversionByCountry || []).map((x) => ({
        country: x.country,
        rate: `${Number(x.rate).toFixed(1)}%`,
        signups: x.signups,
      })),
    [data.conversionByCountry]
  );

  const convBySource = useMemo(
    () =>
      (data.conversionBySource || []).map((x) => ({
        source: x.source,
        signups: x.signups,
        firstBookings: x.firstBookings,
        rate: `${Number(x.rate).toFixed(1)}%`,
      })),
    [data.conversionBySource]
  );

  // -------------------------------------------------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------------------------------------------------
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Growth & Conversion</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-2xl border" onClick={exportAll}>
            Export All
          </button>
          <span
            className={cx(
              "text-xs px-2 py-1 rounded-2xl",
              loading ? "bg-yellow-100 border" : "bg-green-100 border"
            )}
          >
            {loading ? "Loading…" : "Ready"}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-2xl bg-white p-3 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Country</label>
            <input
              placeholder="All"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Category</label>
            <input
              placeholder="All"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Level</label>
            <input
              placeholder="All"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Source</label>
            <input
              placeholder="All"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                setCountry("");
                setCategory("");
                setLevel("");
                setSource("");
              }}
              className="px-3 py-1 rounded-2xl border"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <Section
        title="Funnel: Sign-ups → First booking → Repeat"
        actions={<button onClick={exportFunnel} className="px-3 py-1 rounded-2xl border">CSV</button>}
      >
        {(!data.funnel || data.funnel.length === 0) ? (
          <div className="text-gray-600 text-sm p-3">No data available.</div>
        ) : (
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={data.funnel}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Time-to-first-booking */}
      <Section
        title="Time to first booking (days)"
        actions={<button onClick={exportTTFB} className="px-3 py-1 rounded-2xl border">CSV</button>}
      >
        {(!ttfbBins || ttfbBins.length === 0) ? (
          <div className="text-gray-600 text-sm p-3">No data available.</div>
        ) : (
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={ttfbBins}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="bin" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Monthly students */}
      <Section
        title="Monthly students (new vs returning)"
        actions={<button onClick={exportMonthlyStudents} className="px-3 py-1 rounded-2xl border">CSV</button>}
      >
        {(!studentsMonthly || studentsMonthly.length === 0) ? (
          <div className="text-gray-600 text-sm p-3">No data available.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={studentsMonthly} stackOffset="expand">
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="new" stackId="a" />
                <Bar dataKey="returning" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Monthly tutors */}
      <Section
        title="Monthly tutors (new vs active)"
        actions={<button onClick={exportMonthlyTutors} className="px-3 py-1 rounded-2xl border">CSV</button>}
      >
        {(!tutorsMonthly || tutorsMonthly.length === 0) ? (
          <div className="text-gray-600 text-sm p-3">No data available.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={tutorsMonthly} stackOffset="expand">
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="new" stackId="b" />
                <Bar dataKey="active" stackId="b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Conversion by country */}
      <Section
        title="Conversion by country"
        actions={<button onClick={exportCountryConv} className="px-3 py-1 rounded-2xl border">CSV</button>}
      >
        {(!convByCountry || convByCountry.length === 0) ? (
          <div className="text-gray-600 text-sm p-3">No data available.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={convByCountry}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" name="Rate (%)" />
                <Bar dataKey="signups" name="Sign-ups" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Conversion by source */}
      <Section
        title="Conversion by source"
        actions={<button onClick={exportSourceConv} className="px-3 py-1 rounded-2xl border">CSV</button>}
      >
        {(!convBySource || convBySource.length === 0) ? (
          <div className="text-gray-600 text-sm p-3">No data available.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[40rem] text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Source</th>
                  <th className="text-left px-3 py-2 border-b">Sign-ups</th>
                  <th className="text-left px-3 py-2 border-b">First bookings</th>
                  <th className="text-left px-3 py-2 border-b">Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {convBySource.map((r, i) => (
                  <tr key={i} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-3 py-2 border-b">{r.source}</td>
                    <td className="px-3 py-2 border-b">{r.signups}</td>
                    <td className="px-3 py-2 border-b">{r.firstBookings}</td>
                    <td className="px-3 py-2 border-b">{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
