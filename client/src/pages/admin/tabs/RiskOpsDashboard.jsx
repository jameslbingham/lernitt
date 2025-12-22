// client/src/pages/admin/tabs/RiskOpsDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/* =========================
   Small utilities
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
const range = (n) => Array.from({ length: n }, (_, i) => i);

/* =========================
   Data fetch with robust mocks
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

    // ---------- MOCK GENERATOR (12 months) ----------
    const urlObj = new URL(url, "http://x");
    const from = urlObj.searchParams.get("from");
    const to = urlObj.searchParams.get("to");

    const now = new Date();
    const months = range(12).map((i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      d.setDate(1);
      return new Date(d);
    });

    const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const rndFloat = (min, max, dp = 2) => +((Math.random() * (max - min) + min).toFixed(dp));

    // Refunds & chargebacks
    const refundsTrend = months.map((m) => ({
      month: monthKey(m),
      count: rndInt(2, 18),
      amount: rndFloat(80, 1200),
    }));
    const chargebacksTrend = months.map((m) => ({
      month: monthKey(m),
      count: rndInt(0, 6),
      amount: rndFloat(0, 800),
    }));

    // Disputes trend
    const disputesTrend = months.map((m) => {
      const opened = rndInt(5, 30);
      const resolved = Math.max(0, opened - rndInt(0, 8));
      return { month: monthKey(m), opened, resolved };
    });

    // Support
    const supportTrend = months.map((m) => {
      const opened = rndInt(20, 120);
      const closed = rndInt(Math.floor(opened * 0.6), opened + rndInt(0, 20));
      return { month: monthKey(m), opened, closed };
    });
    const supportKpis = {
      backlog: rndInt(5, 60),
      medianResolutionHours: rndFloat(8, 72, 1),
    };

    // Error logs (recent ~150)
    const errorTypes = [
      "auth_failed",
      "payment_error",
      "timeout",
      "not_found",
      "validation",
      "rate_limited",
    ];
    const errorLogs = range(150).map((i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - rndInt(0, 45));
      d.setHours(rndInt(0, 23), rndInt(0, 59), rndInt(0, 59), 0);
      return {
        at: d.toISOString(),
        type: errorTypes[rndInt(0, errorTypes.length - 1)],
        message:
          [
            "Stripe charge failed",
            "JWT invalid or expired",
            "Lesson not found",
            "Tutor schedule conflict",
            "Rate limit exceeded",
            "Validation: missing field",
          ][rndInt(0, 5)],
        userId: Math.random() < 0.5 ? `u${rndInt(1, 1500)}` : undefined,
      };
    });

    // Flagged activities (suspicious)
    const reasons = [
      "multiple chargebacks",
      "suspicious booking pattern",
      "abnormal login geolocation",
      "spam messaging",
      "payment mismatch",
    ];
    const flaggedActivities = range(30).map((i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - rndInt(0, 60));
      d.setHours(rndInt(0, 23), rndInt(0, 59), 0, 0);
      return {
        id: `F${i + 1}`,
        reason: reasons[rndInt(0, reasons.length - 1)],
        userId: `u${rndInt(1, 2000)}`,
        at: d.toISOString(),
      };
    });

    // Apply from/to filter to month-based series
    const monthInRange = (m) => {
      const ms = new Date(`${m}-01T00:00:00Z`).getTime();
      if (from && ms < new Date(from).getTime()) return false;
      if (to && ms > new Date(to).getTime()) return false;
      return true;
    };
    const dateInRange = (iso) => {
      const t = new Date(iso).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime()) return false;
      return true;
    };

    return {
      refundsTrend: refundsTrend.filter((r) => monthInRange(r.month)),
      chargebacksTrend: chargebacksTrend.filter((r) => monthInRange(r.month)),
      disputesTrend: disputesTrend.filter((r) => monthInRange(r.month)),
      supportKpis,
      supportTrend: supportTrend.filter((r) => monthInRange(r.month)),
      errorLogs: errorLogs.filter((e) => dateInRange(e.at)),
      flaggedActivities: flaggedActivities.filter((f) => dateInRange(f.at)),
    };
  }
}

/* =========================
   Component
========================= */
export default function RiskOpsDashboard() {
  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [errorType, setErrorType] = useState("");
  const [errorQuery, setErrorQuery] = useState("");
  const [flagQuery, setFlagQuery] = useState("");

  // Data
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
    const res = await safeFetchJSON(`${API}/api/metrics/riskops?${params.toString()}`);
    setData(res);
    setLoading(false);
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setErrorType("");
    setErrorQuery("");
    setFlagQuery("");
  }

  // Derived filtered logs/flags
  const filteredErrors = useMemo(() => {
    const list = data?.errorLogs || [];
    return list.filter((e) => {
      if (errorType && e.type !== errorType) return false;
      if (errorQuery && !JSON.stringify(e).toLowerCase().includes(errorQuery.toLowerCase())) return false;
      return true;
    });
  }, [data, errorType, errorQuery]);

  const filteredFlags = useMemo(() => {
    const list = data?.flaggedActivities || [];
    if (!flagQuery.trim()) return list;
    const q = flagQuery.trim().toLowerCase();
    return list.filter((f) => JSON.stringify(f).toLowerCase().includes(q));
  }, [data, flagQuery]);

  /* ============
     CSV exports
  ============ */
  function exportRefundsCountsCSV() {
    const rows = [["Month", "Refund Count"], ...(data?.refundsTrend || []).map((r) => [r.month, r.count])];
    csvDownload(`refunds_counts_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportRefundsAmountsCSV() {
    const rows = [["Month", "Refund Amount"], ...(data?.refundsTrend || []).map((r) => [r.month, r.amount])];
    csvDownload(`refunds_amounts_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportChargebacksCountsCSV() {
    const rows = [["Month", "Chargeback Count"], ...(data?.chargebacksTrend || []).map((r) => [r.month, r.count])];
    csvDownload(`chargebacks_counts_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportChargebacksAmountsCSV() {
    const rows = [["Month", "Chargeback Amount"], ...(data?.chargebacksTrend || []).map((r) => [r.month, r.amount])];
    csvDownload(`chargebacks_amounts_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportDisputesCSV() {
    const rows = [["Month", "Opened", "Resolved"], ...(data?.disputesTrend || []).map((r) => [r.month, r.opened, r.resolved])];
    csvDownload(`disputes_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportSupportTrendCSV() {
    const rows = [["Month", "Opened", "Closed"], ...(data?.supportTrend || []).map((r) => [r.month, r.opened, r.closed])];
    csvDownload(`support_trend_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportSupportKpisCSV() {
    const k = data?.supportKpis || { backlog: 0, medianResolutionHours: 0 };
    const rows = [
      ["Backlog", "MedianResolutionHours"],
      [k.backlog, k.medianResolutionHours],
    ];
    csvDownload(`support_kpis_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportErrorLogsCSV() {
    const rows = [["At", "Type", "Message", "UserId"], ...(filteredErrors || []).map((e) => [e.at, e.type, e.message, e.userId || ""])];
    csvDownload(`error_logs_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportFlagsCSV() {
    const rows = [["Id", "Reason", "UserId", "At"], ...(filteredFlags || []).map((f) => [f.id, f.reason, f.userId, f.at])];
    csvDownload(`flagged_activities_${fmtDateISO(new Date())}.csv`, rows);
  }
  function exportAllCSVs() {
    exportRefundsCountsCSV();
    exportRefundsAmountsCSV();
    exportChargebacksCountsCSV();
    exportChargebacksAmountsCSV();
    exportDisputesCSV();
    exportSupportTrendCSV();
    exportSupportKpisCSV();
    exportErrorLogsCSV();
    exportFlagsCSV();
  }

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 space-y-2">
        <h2 className="font-bold mb-2">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-2 py-1" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-2 py-1" />
          <select value={errorType} onChange={(e) => setErrorType(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All error types</option>
            <option value="auth_failed">auth_failed</option>
            <option value="payment_error">payment_error</option>
            <option value="timeout">timeout</option>
            <option value="not_found">not_found</option>
            <option value="validation">validation</option>
            <option value="rate_limited">rate_limited</option>
          </select>
          <input
            placeholder="Search error logs…"
            value={errorQuery}
            onChange={(e) => setErrorQuery(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            placeholder="Search flagged activities…"
            value={flagQuery}
            onChange={(e) => setFlagQuery(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={load} className="px-3 py-1 border rounded">Apply</button>
          <button onClick={clearFilters} className="px-3 py-1 border rounded">Clear</button>
          <button onClick={exportAllCSVs} className="px-3 py-1 border rounded">Export All CSVs</button>
        </div>
      </div>

      {/* Refunds — Counts */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Refunds — Monthly Counts</h3>
          <button onClick={exportRefundsCountsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.refundsTrend?.length ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.refundsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Refund Count" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No refund count data.</div>}
      </div>

      {/* Refunds — Amounts */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Refunds — Monthly Amounts</h3>
          <button onClick={exportRefundsAmountsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.refundsTrend?.length ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.refundsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Bar dataKey="amount" name="Refund Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No refund amount data.</div>}
      </div>

      {/* Chargebacks — Counts */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Chargebacks — Monthly Counts</h3>
          <button onClick={exportChargebacksCountsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.chargebacksTrend?.length ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chargebacksTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Chargeback Count" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No chargeback count data.</div>}
      </div>

      {/* Chargebacks — Amounts */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Chargebacks — Monthly Amounts</h3>
          <button onClick={exportChargebacksAmountsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.chargebacksTrend?.length ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chargebacksTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Bar dataKey="amount" name="Chargeback Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No chargeback amount data.</div>}
      </div>

      {/* Disputes velocity */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Disputes Velocity — Opened vs Resolved</h3>
          <button onClick={exportDisputesCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.disputesTrend?.length ? (
          <div style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.disputesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" name="Opened" />
                <Line type="monotone" dataKey="resolved" name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No disputes trend data.</div>}
      </div>

      {/* Support KPIs + Trend */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Support — KPIs</h3>
          <button onClick={exportSupportKpisCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="border rounded-xl p-3 bg-gray-50">
            <div className="text-xs text-gray-500">Backlog</div>
            <div className="text-2xl font-semibold">{data?.supportKpis?.backlog ?? "—"}</div>
          </div>
          <div className="border rounded-xl p-3 bg-gray-50">
            <div className="text-xs text-gray-500">Median Resolution (hrs)</div>
            <div className="text-2xl font-semibold">
              {data?.supportKpis?.medianResolutionHours ?? "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Support — Opened vs Closed (Monthly)</h3>
          <button onClick={exportSupportTrendCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {data?.supportTrend?.length ? (
          <div style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.supportTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" name="Opened" />
                <Line type="monotone" dataKey="closed" name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="text-gray-500">No support trend data.</div>}
      </div>

      {/* Error Logs */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Error Logs</h3>
          <button onClick={exportErrorLogsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {filteredErrors.length ? (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">At</th>
                <th className="px-3 py-2 border">Type</th>
                <th className="px-3 py-2 border">Message</th>
                <th className="px-3 py-2 border">User</th>
              </tr>
            </thead>
            <tbody>
              {filteredErrors.map((e, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border">{new Date(e.at).toLocaleString()}</td>
                  <td className="px-3 py-2 border">{e.type}</td>
                  <td className="px-3 py-2 border">{e.message}</td>
                  <td className="px-3 py-2 border">{e.userId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-gray-500">No error logs match your filters.</div>}
      </div>

      {/* Flagged Activities */}
      <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Flagged Activities</h3>
          <button onClick={exportFlagsCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
        {filteredFlags.length ? (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">ID</th>
                <th className="px-3 py-2 border">Reason</th>
                <th className="px-3 py-2 border">User</th>
                <th className="px-3 py-2 border">At</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlags.map((f) => (
                <tr key={f.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border">{f.id}</td>
                  <td className="px-3 py-2 border">{f.reason}</td>
                  <td className="px-3 py-2 border">{f.userId}</td>
                  <td className="px-3 py-2 border">{new Date(f.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-gray-500">No flagged records match your filters.</div>}
      </div>
    </div>
  );
}
