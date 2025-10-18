// client/src/pages/admin/tabs/Finance.jsx
// -----------------------------------------------------------------------------
// Finance Dashboard (Full Feature-Rich Version) — POLISHED
// -----------------------------------------------------------------------------
// ✅ Works with real API and VITE_MOCK=1
// ✅ Summary metrics, refund metrics + trends
// ✅ KPI cards, charts, tables, commission breakdowns
// ✅ Queues & Fails actions with toasts + confirms
// ✅ Export ALL (CSV) and XLSX (numeric cells)
// ✅ Display currency (FX conversion) + per-currency splits
// ✅ GMV, Platform Fee, Tutor Net (global/per-currency/per-tutor)
// ✅ FX source: /api/finance/rates with mock fallback + manual override
// ✅ ErrorBoundary, skeletons, drilldowns, column visibility, saved views
// -----------------------------------------------------------------------------
// Refactor notes:
// • Uses /lib/safeFetch.js for all API calls.
// • Uses export helpers from /lib/adminExports.js
// • Keeps existing UI/logic; removes inline export helpers & ad-hoc fetch.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Toasts + Confirms (project-wide providers)
import { useToast } from "@/components/ui/ToastProvider.jsx";
import { useConfirm } from "@/components/ui/ConfirmProvider";

// Shared helpers
import { safeFetchJSON } from "@/lib/safeFetch.js";

// 🔁 FIXED: import the correct functions from adminExports.js
import { exportTableToCSV, exportTableToXLSX } from "@/lib/adminExports.js";

/* ============================ API + constants ============================ */
const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/* ============================== utils/helpers ============================== */
const n = (v) => (typeof v === "number" ? v : Number(v || 0));

// Intl-safe number formatters
const nf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const fmt = (v) => nf.format(Number.isFinite(+v) ? +v : 0);
const fmt0 = (v) => nf0.format(Number.isFinite(+v) ? +v : 0);

const pad = (x) => String(x).padStart(2, "0");
const ymd = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s || "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const ym = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s || "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/**
 * withinPeriod — keep items within a time period
 */
function withinPeriod(dateStr, period) {
  if (period === "all") return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  const start = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = (now.getDay() + 6) % 7; // Monday start
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return d >= start && d <= now;
}

/* ============================ currency utilities =========================== */
function normalizeFxShape(raw) {
  if (!raw || typeof raw !== "object") {
    return { base: "USD", ts: new Date().toISOString(), rates: { USD: 1 } };
  }
  const base = raw.base || "USD";
  const rates = raw.rates && typeof raw.rates === "object" ? raw.rates : { [base]: 1 };
  if (!rates[base]) rates[base] = 1;
  return { base, ts: raw.ts || new Date().toISOString(), rates };
}

function makeFx(base, rates, displayCurrency) {
  const safeRates = { ...(rates || {}), [base]: rates?.[base] ?? 1, [displayCurrency]: rates?.[displayCurrency] ?? 1 };
  function convert(amount, from) {
    const amt = n(amount);
    const rFrom = safeRates[from] ?? 1;
    const rDisp = safeRates[displayCurrency] ?? 1;
    if (!rFrom || !rDisp) return amt;
    return (amt / rFrom) * rDisp;
  }
  return convert;
}

function sumByCurrency(rows, getAmount, getCurrency) {
  const acc = {};
  for (const r of rows || []) {
    const c = getCurrency(r) || "USD";
    const v = n(getAmount(r));
    acc[c] = (acc[c] || 0) + v;
  }
  return acc;
}

/* =============================== Error Boundary ============================== */
function RetryCard({ onRetry, error }) {
  return (
    <div className="p-4 border rounded-2xl bg-white">
      <h3 className="font-bold mb-2">Something went wrong.</h3>
      {error?.message ? <div className="text-sm text-red-600 mb-3">{String(error.message)}</div> : null}
      <button className="px-3 py-1 border rounded" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(error) {
    return { err: error };
  }
  render() {
    if (this.state.err) {
      return <RetryCard error={this.state.err} onRetry={() => location.reload()} />;
    }
    return this.props.children;
  }
}

/* =============================== Skeletons ================================= */
function SkeletonBlock({ h = "h-72" }) {
  return <div className={`animate-pulse ${h} bg-gray-100 rounded`} />;
}
function SkeletonTable({ rows = 6 }) {
  return (
    <table className="min-w-full text-sm">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-t">
            <td className="p-2">
              <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
/* ================================= component ================================ */
export default function Finance() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  // Data sets
  const [payouts, setPayouts] = useState([]);
  const [refunds, setRefunds] = useState([]);

  // Filtering & controls
  const [period, setPeriod] = useState("week");
  const [rate, setRate] = useState(0.15);
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [tutorFilter, setTutorFilter] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // YYYY-MM
  const [to, setTo] = useState(""); // YYYY-MM

  // Display currency & FX
  const [fx, setFx] = useState({ base: "USD", rates: { USD: 1 }, ts: "" });
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [manualRates, setManualRates] = useState(""); // JSON string for manual override (optional)
  const [fxError, setFxError] = useState("");
  const usingManualFx = !!manualRates;
  const usingFallbackFx = !fx?.ts;

  // Summary payload from /api/finance/summary
  const [summary, setSummary] = useState({
    totals: {},
    tutors: [],
    trends: [],
    totalRefunds: 0,
    approvedRefunds: 0,
    deniedRefunds: 0,
    pendingRefunds: 0,
    refundTrends: [],
  });

  // Loading + errors
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Column visibility (persisted)
  const [showCols, setShowCols] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fin_cols") || "{}");
    } catch {
      return {};
    }
  });

  // Saved views (label left in place for diff readability)
  const [viewName, setViewName] = useState("");
  const [views, setViews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fin_views") || "{}");
    } catch {
      return {};
    }
  });

  // session cache guard to avoid double apply
  const cacheAppliedRef = useRef(false);

  /* --------------------------------- load --------------------------------- */
  useEffect(() => {
    // Try session cache first
    if (!cacheAppliedRef.current) {
      const cache = sessionStorage.getItem("fin_summary");
      if (cache) {
        try {
          const parsed = JSON.parse(cache);
          setSummary(parsed);
        } catch {}
      }
      cacheAppliedRef.current = true;
    }

    async function loadAll() {
      setLoading(true);
      setLoadError("");
      try {
        // Payouts / Refunds via safeFetchJSON (server or mock handled inside)
        const [pR, rR] = await Promise.all([
          safeFetchJSON(`${API}/api/payouts`).catch(() => []),
          safeFetchJSON(`${API}/api/refunds`).catch(() => []),
        ]);
        setPayouts(pR?.items || pR || []);
        setRefunds(rR?.items || rR || []);

        // Summary (GUARDED)
        const sum = (await safeFetchJSON(`${API}/api/finance/summary`)) || {};
        const next = {
          totals: sum.totals || {},
          tutors: Array.isArray(sum.tutors) ? sum.tutors : [],
          trends: Array.isArray(sum.trends) ? sum.trends : [],
          totalRefunds: n(sum.totalRefunds),
          approvedRefunds: n(sum.approvedRefunds),
          deniedRefunds: n(sum.deniedRefunds),
          pendingRefunds: n(sum.pendingRefunds),
          refundTrends: Array.isArray(sum.refundTrends) ? sum.refundTrends : [],
        };
        setSummary(next);
        try {
          sessionStorage.setItem("fin_summary", JSON.stringify(next));
        } catch {}

        // FX rates
        const rawRates = await safeFetchJSON(`${API}/api/finance/rates`);
        const norm = normalizeFxShape(rawRates);
        setFx(norm);
        setDisplayCurrency(norm.base || "USD");
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load finance data.");
        toast.error("Failed to load finance data.");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------- actions ------------------------------- */
  const approvePayout = useCallback(
    async (id) => {
      const ok = await confirm(`Approve payout ${id}?`);
      if (!ok) return;
      try {
        await safeFetchJSON(`${API}/api/payouts/${id}/approve`, { method: "POST" });
        setPayouts((ps) => ps.map((p) => (p.id === id ? { ...p, status: "paid" } : p)));
        toast.success("Payout approved.");
      } catch (e) {
        console.error(e);
        toast.error("Failed to approve payout.");
      }
    },
    [confirm, toast]
  );

  const denyRefund = useCallback(
    async (id) => {
      const ok = await confirm(`Deny refund ${id}?`);
      if (!ok) return;
      try {
        await safeFetchJSON(`${API}/api/refunds/${id}/deny`, { method: "POST" });
        setRefunds((rs) => rs.map((r) => (r.id === id ? { ...r, status: "denied" } : r)));
        toast.success("Refund denied.");
      } catch (e) {
        console.error(e);
        toast.error("Failed to deny refund.");
      }
    },
    [confirm, toast]
  );

  /* ------------------------------- filtering ------------------------------- */
  // DEFENSIVE: never call .filter on a non-array
  const applyFilters = useCallback(
    (listInput) => {
      const list = Array.isArray(listInput) ? listInput : (listInput?.items || []);
      if (!Array.isArray(list)) return []; // final guard

      return list.filter((row) => {
        if (!row || !row.createdAt) return false;
        if (!withinPeriod(row.createdAt, period)) return false;
        if (currencyFilter && row.currency !== currencyFilter) return false;
        if (tutorFilter && (row.tutor !== tutorFilter && row.tutor?.name !== tutorFilter)) return false;
        if (q && !JSON.stringify(row).toLowerCase().includes(q.toLowerCase())) return false;
        if (from && new Date(row.createdAt) < new Date(from + "-01")) return false;
        if (to) {
          const end = new Date(to + "-31");
          if (new Date(row.createdAt) > end) return false;
        }
        return true;
      });
    },
    [period, currencyFilter, tutorFilter, q, from, to]
  );

  const fPayouts = useMemo(() => applyFilters(payouts), [payouts, applyFilters]);
  const fRefunds = useMemo(() => applyFilters(refunds), [refunds, applyFilters]);

  /* ------------------------ display currency conversion ---------------------- */
  const convert = useMemo(
    () => makeFx(fx.base || "USD", fx.rates || { USD: 1 }, displayCurrency || fx.base || "USD"),
    [fx.base, fx.rates, displayCurrency]
  );
  const cAmt = useCallback((amount, currency) => convert(n(amount), currency || fx.base || "USD"), [convert, fx.base]);

  /* --------------------------------- totals -------------------------------- */
  const nativeTotalPayouts = fPayouts.reduce((s, p) => s + n(p.amount), 0); // kept for reference
  const nativeTotalRefunds = fRefunds.reduce((s, r) => s + n(r.amount), 0); // kept for reference

  const totalPayouts = fPayouts.reduce((s, p) => s + cAmt(p.amount, p.currency), 0);
  const totalRefunds = fRefunds.reduce((s, r) => s + cAmt(r.amount, r.currency), 0);

  const gmv = (1 - n(rate)) !== 0 ? totalPayouts / (1 - n(rate)) : totalPayouts;
  const platformFee = gmv * n(rate);
  const tutorNet = gmv - platformFee - totalRefunds;

  const byDayForForecast = useMemo(() => {
    const map = {};
    fPayouts.forEach((p) => {
      const k = ymd(p.createdAt);
      map[k] = map[k] || { date: k, payouts: 0, refunds: 0, net: 0 };
      map[k].payouts += cAmt(p.amount, p.currency);
    });
    fRefunds.forEach((r) => {
      const k = ymd(r.createdAt);
      map[k] = map[k] || { date: k, payouts: 0, refunds: 0, net: 0 };
      map[k].refunds += cAmt(r.amount, r.currency);
    });
    return Object.values(map).map((x) => ({ ...x, net: x.payouts - x.refunds }));
  }, [fPayouts, fRefunds, cAmt]);

  const avgDaily = byDayForForecast.length
    ? byDayForForecast.reduce((s, r) => s + r.net, 0) / byDayForForecast.length
    : 0;
  const forecast30 = avgDaily * 30;
  /* --------------------------------- queues -------------------------------- */
  const queuedPayouts = useMemo(() => fPayouts.filter((p) => p.status === "queued"), [fPayouts]);
  const queuedRefunds = useMemo(() => fRefunds.filter((r) => r.status === "queued"), [fRefunds]);
  const failedPayouts = useMemo(() => fPayouts.filter((p) => p.status === "failed"), [fPayouts]);
  const failedRefunds = useMemo(() => fRefunds.filter((r) => r.status === "failed"), [fRefunds]);

  /* ------------------------------ breakdowns ------------------------------ */
  const byDay = useMemo(() => {
    const map = {};
    fPayouts.forEach((p) => {
      const k = ymd(p.createdAt);
      map[k] = map[k] || { date: k, payouts: 0, refunds: 0, net: 0 };
      map[k].payouts += cAmt(p.amount, p.currency);
    });
    fRefunds.forEach((r) => {
      const k = ymd(r.createdAt);
      map[k] = map[k] || { date: k, payouts: 0, refunds: 0, net: 0 };
      map[k].refunds += cAmt(r.amount, r.currency);
    });
    return Object.values(map).map((x) => ({ ...x, net: x.payouts - x.refunds }));
  }, [fPayouts, fRefunds, cAmt]);

  const byTutor = useMemo(() => {
    const map = {};
    fPayouts.forEach((p) => {
      const label = p.tutor?.name || p.tutor || "Unknown";
      map[label] = map[label] || { tutor: label, payouts: 0, refunds: 0, net: 0 };
      map[label].payouts += cAmt(p.amount, p.currency);
    });
    fRefunds.forEach((r) => {
      const label = r.tutor?.name || r.tutor || "Unknown";
      map[label] = map[label] || { tutor: label, payouts: 0, refunds: 0, net: 0 };
      map[label].refunds += cAmt(r.amount, r.currency);
    });
    return Object.values(map).map((x) => ({ ...x, net: x.payouts - x.refunds }));
  }, [fPayouts, fRefunds, cAmt]);

  const byCurrencyDisplayConverted = useMemo(() => {
    const nativePayouts = sumByCurrency(fPayouts, (r) => r.amount, (r) => r.currency);
    const nativeRefunds = sumByCurrency(fRefunds, (r) => r.amount, (r) => r.currency);
    const keys = Array.from(new Set([...Object.keys(nativePayouts), ...Object.keys(nativeRefunds)]));
    return keys.map((cur) => {
      const p = nativePayouts[cur] || 0;
      const r = nativeRefunds[cur] || 0;
      const pDisp = cAmt(p, cur);
      const rDisp = cAmt(r, cur);
      const netDisp = pDisp - rDisp;
      const gmvCur = (1 - n(rate)) !== 0 ? pDisp / (1 - n(rate)) : pDisp;
      const feeCur = gmvCur * n(rate);
      const tutorNetCur = gmvCur - feeCur - rDisp;
      return {
        currency: cur,
        nativePayouts: p,
        nativeRefunds: r,
        payouts: pDisp,
        refunds: rDisp,
        net: netDisp,
        GMV: gmvCur,
        PlatformFee: feeCur,
        TutorNet: tutorNetCur,
      };
    });
  }, [fPayouts, fRefunds, cAmt, rate]);

  const byMonth = useMemo(() => {
    const map = {};
    fPayouts.forEach((p) => {
      const k = ym(p.createdAt);
      map[k] = map[k] || { month: k, payouts: 0, refunds: 0, net: 0 };
      map[k].payouts += cAmt(p.amount, p.currency);
    });
    fRefunds.forEach((r) => {
      const k = ym(r.createdAt);
      map[k] = map[k] || { month: k, payouts: 0, refunds: 0, net: 0 };
      map[k].refunds += cAmt(r.amount, r.currency);
    });
    return Object.values(map).map((x) => ({ ...x, net: x.payouts - x.refunds }));
  }, [fPayouts, fRefunds, cAmt]);

  const commissionByTutor = useMemo(
    () => byTutor.map((t) => ({ tutor: t.tutor, commission: t.payouts * n(rate) })),
    [byTutor, rate]
  );
  const commissionByCurrency = useMemo(
    () => byCurrencyDisplayConverted.map((c) => ({ currency: c.currency, commission: c.payouts * n(rate) })),
    [byCurrencyDisplayConverted, rate]
  );

  /* --------------------------- dropdown options ---------------------------- */
  const tutorOptions = useMemo(() => {
    const a = new Set();
    for (const p of payouts) {
      if (p.tutor?.name) a.add(p.tutor.name);
      else if (p.tutor) a.add(p.tutor);
    }
    return Array.from(a);
  }, [payouts]);

  const currencyOptions = useMemo(
    () => Array.from(new Set(payouts.map((p) => p.currency).filter(Boolean))),
    [payouts]
  );

  const displayCurrencyOptions = useMemo(() => {
    const keys = Object.keys(fx.rates || { USD: 1 });
    if (!keys.includes(fx.base)) keys.push(fx.base);
    const uniq = Array.from(new Set(keys.filter(Boolean)));
    const sorted = uniq.sort();
    if (sorted.includes(fx.base)) {
      const filtered = sorted.filter((k) => k !== fx.base);
      return [fx.base, ...filtered];
    }
    return sorted;
  }, [fx]);

  /* ------------------------------- exports ext ------------------------------ */
  const to2 = (num) => Math.round(n(num) * 100) / 100;
  const exportAllRows = useMemo(() => {
    const payoutsRows = (fPayouts || []).map((p) => ({
      type: "payout",
      id: p.id,
      tutor: p.tutor?.name || p.tutor || "",
      amount_native: to2(p.amount),
      currency_native: p.currency || "",
      amount_display: to2(cAmt(p.amount, p.currency)),
      currency_display: displayCurrency,
      status: p.status || "",
      createdAt: p.createdAt || "",
    }));
    const refundRows = (fRefunds || []).map((r) => ({
      type: "refund",
      id: r.id,
      student: r.student?.name || r.student || "",
      tutor: r.tutor?.name || r.tutor || "",
      amount_native: to2(r.amount),
      currency_native: r.currency || "",
      amount_display: to2(cAmt(r.amount, r.currency)),
      currency_display: displayCurrency,
      status: r.status || "",
      createdAt: r.createdAt || "",
    }));
    return [...payoutsRows, ...refundRows];
  }, [fPayouts, fRefunds, cAmt, displayCurrency]);

  /* ------------------------------ permissions ------------------------------ */
  function canSeeFinance() {
    try {
      const role = localStorage.getItem("role") || "admin";
      return ["finance", "owner"].includes(role);
    } catch {
      return false;
    }
  }

  /* ------------------------------ saved views ------------------------------ */
  const saveView = useCallback(() => {
    const v = { period, rate, currencyFilter, tutorFilter, q, from, to, displayCurrency };
    const name = viewName || `View ${Object.keys(views).length + 1}`;
    const next = { ...views, [name]: v };
    setViews(next);
    try {
      localStorage.setItem("fin_views", JSON.stringify(next));
    } catch {}
  }, [period, rate, currencyFilter, tutorFilter, q, from, to, displayCurrency, viewName, views]);

  const loadView = useCallback(
    (name) => {
      const v = views[name];
      if (!v) return;
      setPeriod(v.period);
      setRate(v.rate);
      setCurrencyFilter(v.currencyFilter);
      setTutorFilter(v.tutorFilter);
      setQ(v.q);
      setFrom(v.from);
      setTo(v.to);
      setDisplayCurrency(v.displayCurrency);
    },
    [views]
  );

  /* ------------------------------ column prefs ----------------------------- */
  useEffect(() => {
    try {
      localStorage.setItem("fin_cols", JSON.stringify(showCols));
    } catch {}
  }, [showCols]);

  const col = useCallback((k) => showCols[k] !== false, [showCols]);

  /* ------------------------------ Fx refresh ------------------------------- */
  const refreshFx = useCallback(async () => {
    setFxError("");
    try {
      const raw = await safeFetchJSON(`${API}/api/finance/rates`);
      const norm = normalizeFxShape(raw);
      setFx(norm);
      if (!displayCurrency || !norm.rates[displayCurrency]) {
        setDisplayCurrency(norm.base || "USD");
      }
      toast.success("FX rates refreshed.");
    } catch (err) {
      setFxError("Failed to refresh FX rates.");
      toast.error("FX refresh failed.");
    }
  }, [displayCurrency, toast]);
  /* ----------------------------------- UI ---------------------------------- */
  return (
    <ErrorBoundary>
      <div className="p-4 space-y-6" aria-live="polite">
        {/* ============================== Controls ============================== */}
        <div className="flex flex-wrap gap-2 items-center">
          <h2 className="font-bold text-xl">
            Finance Dashboard {IS_MOCK && <span>(Mock)</span>}
          </h2>

          {/* Period selector */}
          <label className="text-sm">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded px-2 py-1"
            aria-label="Select period"
          >
            <option value="today">Today</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="all">All</option>
          </select>

          {/* Currency filter (native) */}
          <label className="text-sm">Row Currency</label>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="border rounded px-2 py-1"
            aria-label="Filter by native row currency"
          >
            <option value="">All</option>
            {currencyOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          {/* Tutor filter */}
          <label className="text-sm">Tutor</label>
          <select
            value={tutorFilter}
            onChange={(e) => setTutorFilter(e.target.value)}
            className="border rounded px-2 py-1"
            aria-label="Filter by tutor"
          >
            <option value="">All</option>
            {tutorOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          {/* Commission */}
          <label className="text-sm">Commission %</label>
          <input
            type="number"
            value={rate}
            step="0.01"
            min="0"
            max="0.95"
            onChange={(e) => setRate(Number(e.target.value))}
            className="border rounded px-2 py-1 w-24"
            title="Platform fee as a fraction, e.g., 0.15 = 15%"
          />

          {/* Search */}
          <input
            type="text"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border rounded px-2 py-1"
            aria-label="Search any text"
          />

          {/* Month range */}
          <input
            type="month"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1"
            title="From (YYYY-MM)"
          />
          <input
            type="month"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1"
            title="To (YYYY-MM)"
          />

          {/* Display Currency (FX) */}
          <label className="text-sm">Display Currency</label>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="border rounded px-2 py-1"
            title="All cards/charts/tables convert amounts into this currency for display"
          >
            {displayCurrencyOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          {/* Saved Views */}
          <input
            className="border rounded px-2 py-1"
            placeholder="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            aria-label="Saved view name"
          />
          <button
            className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
            onClick={saveView}
          >
            Save View
          </button>
          <select
            className="border rounded px-2 py-1"
            onChange={(e) => loadView(e.target.value)}
            aria-label="Load saved view"
          >
            <option value="">Load View…</option>
            {Object.keys(views).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>

          {/* Exports */}
          <button
            onClick={() => exportTableToCSV(exportAllRows, "finance_all.csv")}
            className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Export All (CSV)
          </button>
          <button
            onClick={() => exportTableToXLSX(exportAllRows, "finance.xlsx", "Finance")}
            className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Export XLSX
          </button>
        </div>

        {/* ============================ FX Controls Row =========================== */}
        <div className="bg-white border rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              <b>FX Base:</b> {fx.base || "—"} &nbsp; <b>As of:</b>{" "}
              {fx.ts ? new Date(fx.ts).toLocaleString() : "—"}{" "}
              {usingManualFx && <span title="Manual FX active">• Manual</span>}
              {usingFallbackFx && <span title="Fallback FX in use">• Fallback</span>}
            </div>
            <div className="text-sm">
              <b>Known rates:</b>{" "}
              {Object.keys(fx.rates || {}).slice(0, 8).join(", ")}
              {Object.keys(fx.rates || {}).length > 8 ? "…" : ""}
            </div>
            <button
              className="px-3 py-1 border rounded ml-auto focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={refreshFx}
            >
              Refresh FX
            </button>
          </div>

          {/* Manual FX override (optional) */}
          <div className="mt-3">
            <details>
              <summary className="cursor-pointer text-sm">Manual FX override (JSON)</summary>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <textarea
                  className="border rounded p-2 min-h=[80px] min-h-[80px]"
                  placeholder='{"base":"USD","rates":{"USD":1,"EUR":0.92}}'
                  value={manualRates}
                  onChange={(e) => setManualRates(e.target.value)}
                />
                <div className="flex flex-col gap-2">
                  <button
                    className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                    onClick={() => {
                      setFxError("");
                      try {
                        const parsed = JSON.parse(manualRates || "{}");
                        const norm = normalizeFxShape(parsed);
                        setFx(norm);
                        if (!norm.rates[displayCurrency]) {
                          setDisplayCurrency(norm.base || "USD");
                        }
                        toast.success("Manual FX applied.");
                      } catch (err) {
                        setFxError("Invalid JSON for manual FX override.");
                        toast.error("Manual FX JSON invalid.");
                      }
                    }}
                  >
                    Apply
                  </button>
                  <button
                    className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                    onClick={() => {
                      setManualRates("");
                      setFxError("");
                      toast.success("Manual FX cleared.");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {fxError ? <div className="text-red-600 text-sm mt-2">{fxError}</div> : null}
            </details>
          </div>
        </div>
        {/* ========================= Finance Summary Header ========================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center" aria-label="GMV approximate">
            <div className="text-sm text-gray-500">GMV (approx)</div>
            <div className="text-2xl font-bold text-green-600">
              {displayCurrency} {fmt(gmv)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Based on payouts & commission</div>
          </div>

          {canSeeFinance() && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center" aria-label="Platform fee">
              <div className="text-sm text-gray-500">Platform Fee</div>
              <div className="text-2xl font-bold text-blue-600">
                {displayCurrency} {fmt(platformFee)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Rate: {(n(rate) * 100).toFixed(0)}%</div>
            </div>
          )}

          {canSeeFinance() && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center" aria-label="Tutor net">
              <div className="text-sm text-gray-500">Tutor Net</div>
              <div className="text-2xl font-bold text-amber-600">
                {displayCurrency} {fmt(tutorNet)}
              </div>
              <div className="text-xs text-gray-500 mt-1">After refunds</div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center" aria-label="Total lessons">
            <div className="text-sm text-gray-500">Total Lessons</div>
            <div className="text-2xl font-bold">
              {Array.isArray(summary?.tutors)
                ? summary.tutors.reduce((a, t) => a + (Number(t.lessons) || 0), 0)
                : 0}
            </div>
          </div>
        </div>

        {/* =========================== Totals (Existing) =========================== */}
        {summary?.totals && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-2xl border p-4 text-center">
              <h3 className="font-bold">Total Earnings</h3>
              <p className="text-xl">
                {displayCurrency} {fmt(cAmt(summary.totals.earnings || 0, fx.base))}
              </p>
            </div>
            <div className="bg-white rounded-2xl border p-4 text-center">
              <h3 className="font-bold">Total Payouts</h3>
              <p className="text-xl">
                {displayCurrency} {fmt(totalPayouts)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border p-4 text-center">
              <h3 className="font-bold">Refunds</h3>
              <p className="text-xl">
                {displayCurrency} {fmt(totalRefunds)}
              </p>
            </div>
          </div>
        )}

        {/* =================== Refund Summary Metrics (clickable) ================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            { label: "Total Refunds (count)", val: summary.totalRefunds || 0, cls: "" },
            { label: "Approved Refunds", val: summary.approvedRefunds || 0, cls: "text-green-600" },
            { label: "Denied Refunds", val: summary.deniedRefunds || 0, cls: "text-red-600" },
            { label: "Pending Refunds", val: summary.pendingRefunds || 0, cls: "text-yellow-600" },
          ].map((x) => (
            <div
              key={x.label}
              onClick={() => navigate("/admin?tab=Refunds")}
              className="bg-white border rounded-2xl p-4 text-center cursor-pointer hover:bg-blue-50 transition"
              title="Open Refunds tab"
            >
              <div className="text-sm text-gray-500">{x.label}</div>
              <div className={`text-2xl font-bold ${x.cls}`}>{x.val}</div>
            </div>
          ))}
        </div>

        {/* =========================== Refund Trends Chart ========================= */}
        <div className="bg-white border rounded-2xl p-4">
          <h3 className="font-semibold mb-2">Refund Trends (Last 30 Days)</h3>
          {loading ? (
            <SkeletonBlock />
          ) : (summary.refundTrends || []).length === 0 ? (
            <div className="text-sm text-gray-600">No data for current filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={summary.refundTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name={`Refunds (${displayCurrency})`}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ================================ KPI Cards ============================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Payouts</div>
            <div className="text-xl font-bold">
              {displayCurrency} {fmt(totalPayouts)}
            </div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Refunds</div>
            <div className="text-xl font-bold">
              {displayCurrency} {fmt(totalRefunds)}
            </div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Net (Payouts - Refunds)</div>
            <div className="text-xl font-bold">
              {displayCurrency} {fmt(totalPayouts - totalRefunds)}
            </div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Commission (Payouts × %)</div>
            <div className="text-xl font-bold">
              {displayCurrency} {fmt(totalPayouts * n(rate))}
            </div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Forecast 30d</div>
            <div className="text-xl font-bold">
              {displayCurrency} {fmt(forecast30)}
            </div>
          </div>
        </div>

        {/* ================================ Charts ================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue by Day */}
          <div className="bg-white rounded shadow p-4 h-80" aria-label="Revenue by Day chart">
            <h3>Revenue by Day</h3>
            {loading ? (
              <SkeletonBlock h="h-64" />
            ) : byDay.length === 0 ? (
              <div className="text-sm text-gray-600">No data for current filters.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={byDay}
                  onClick={(e) => {
                    const d = e?.activeLabel;
                    if (d) {
                      setFrom(d.slice(0, 7));
                      setTo(d.slice(0, 7));
                      toast.success(`Filtered to ${d.slice(0, 7)}`);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="net" stroke="#2196f3" name={`Net (${displayCurrency})`} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* By Tutor Earnings */}
          <div className="bg-white rounded shadow p-4 h-80" aria-label="By Tutor earnings chart">
            <h3>By Tutor Earnings</h3>
            {loading ? (
              <SkeletonBlock h="h-64" />
            ) : byTutor.length === 0 ? (
              <div className="text-sm text-gray-600">No data for current filters.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byTutor}
                  onClick={(e) => {
                    const t = e?.activePayload?.[0]?.payload?.tutor;
                    if (t) {
                      setTutorFilter(t);
                      toast.success(`Filtered to tutor: ${t}`);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tutor" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="net" fill="#2196f3" name={`Net (${displayCurrency})`} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Monthly earnings trend */}
          <div className="bg-white rounded shadow p-4 h-80 lg:col-span-2" aria-label="Monthly trend chart">
            <h3>Monthly Trend</h3>
            {loading ? (
              <SkeletonBlock h="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.trends && summary.trends.length ? summary.trends : byMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={summary.trends && summary.trends.length ? "month" : "month"} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {summary.trends && summary.trends.length ? (
                    <Line type="monotone" dataKey="earnings" stroke="#3b82f6" name={`Earnings (${displayCurrency})`} />
                  ) : null}
                  <Line type="monotone" dataKey="net" stroke="#2196f3" name={`Net (${displayCurrency})`} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ========================== Refunds vs Payouts ========================== */}
        <div className="bg-white border rounded-2xl p-4 mt-4" aria-label="Refunds vs Payouts chart">
          <h3 className="font-semibold mb-2">Refunds vs Payouts</h3>
          {loading ? (
            <SkeletonBlock h="h-64" />
          ) : byMonth.length === 0 ? (
            <div className="text-sm text-gray-600">No data for current filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="payouts" fill="#3b82f6" name={`Payouts (${displayCurrency})`} />
                <Bar dataKey="refunds" fill="#ef4444" name={`Refunds (${displayCurrency})`} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ===================== GMV / Fee / Tutor Net by Tutor ===================== */}
        <div className="bg-white border rounded-2xl p-4 mt-4 overflow-auto">
          <h3 className="font-semibold mb-2">GMV / Fee / Tutor Net by Tutor</h3>
          <div className="text-xs text-gray-500 mb-2">
            Approximated from payouts & commission. Converted into {displayCurrency} for display.
          </div>
          {loading ? (
            <SkeletonTable rows={6} />
          ) : (
            <>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Tutor</th>
                    <th className="p-2 text-right">Payouts</th>
                    <th className="p-2 text-right">Refunds</th>
                    {canSeeFinance() && <th className="p-2 text-right">GMV</th>}
                    {canSeeFinance() && <th className="p-2 text-right">Platform Fee</th>}
                    {canSeeFinance() && <th className="p-2 text-right">Tutor Net</th>}
                  </tr>
                </thead>
                <tbody>
                  {byTutor.map((row) => {
                    const g = (1 - n(rate)) !== 0 ? row.payouts / (1 - n(rate)) : row.payouts;
                    const fee = g * n(rate);
                    const net = g - fee - row.refunds;
                    return (
                      <tr
                        key={row.tutor}
                        className="border-t cursor-pointer hover:bg-blue-50"
                        onClick={() => navigate(`/admin?tab=Users&role=tutor&q=${encodeURIComponent(row.tutor)}`)}
                        title="Go to Tutors tab filtered to this tutor"
                      >
                        <td className="p-2">{row.tutor}</td>
                        <td className="p-2 text-right">
                          {displayCurrency} {fmt(row.payouts)}
                        </td>
                        <td className="p-2 text-right">
                          {displayCurrency} {fmt(row.refunds)}
                        </td>
                        {canSeeFinance() && <td className="p-2 text-right">{displayCurrency} {fmt(g)}</td>}
                        {canSeeFinance() && <td className="p-2 text-right">{displayCurrency} {fmt(fee)}</td>}
                        {canSeeFinance() && <td className="p-2 text-right">{displayCurrency} {fmt(net)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex gap-2 mt-2">
                <button
                  className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={() => {
                    const rows = byTutor.map((row) => {
                      const g = (1 - n(rate)) !== 0 ? row.payouts / (1 - n(rate)) : row.payouts;
                      const fee = g * n(rate);
                      const net = g - fee - row.refunds;
                      const base = {
                        Tutor: row.tutor,
                        Payouts: to2(row.payouts),
                        Refunds: to2(row.refunds),
                        Currency: displayCurrency,
                      };
                      if (!canSeeFinance()) return base;
                      return { ...base, GMV: to2(g), PlatformFee: to2(fee), TutorNet: to2(net) };
                    });
                    exportTableToCSV(rows, "gmv_by_tutor.csv");
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={() => {
                    const rows = byTutor.map((row) => {
                      const g = (1 - n(rate)) !== 0 ? row.payouts / (1 - n(rate)) : row.payouts;
                      const fee = g * n(rate);
                      const net = g - fee - row.refunds;
                      const base = {
                        Tutor: row.tutor,
                        Payouts: to2(row.payouts),
                        Refunds: to2(row.refunds),
                        Currency: displayCurrency,
                      };
                      if (!canSeeFinance()) return base;
                      return { ...base, GMV: to2(g), PlatformFee: to2(fee), TutorNet: to2(net) };
                    });
                    exportTableToXLSX(rows, "gmv_by_tutor.xlsx", "GMV_Tutor");
                  }}
                >
                  Export XLSX
                </button>
              </div>
            </>
          )}
        </div>

        {/* =================== GMV / Fee / Tutor Net by Currency =================== */}
        <div className="bg-white border rounded-2xl p-4 mt-4 overflow-auto">
          <h3 className="font-semibold mb-2">GMV / Fee / Tutor Net by Currency</h3>
          <div className="text-xs text-gray-500 mb-2">
            Native sums shown, with converted display columns. GMV/Fees/Tutor Net are shown in {displayCurrency}.
          </div>

          {/* Column visibility menu */}
          <details className="mb-2">
            <summary className="cursor-pointer text-sm">Columns</summary>
            {["nativePayouts", "nativeRefunds", "payouts", "refunds", "GMV", "PlatformFee", "TutorNet", "net"].map(
              (k) => (
                <label key={k} className="mr-3 text-sm">
                  <input
                    type="checkbox"
                    checked={col(k)}
                    onChange={() =>
                      setShowCols((s) => ({
                        ...s,
                        [k]: !(s[k] !== false),
                      }))
                    }
                  />{" "}
                  {k}
                </label>
              )
            )}
          </details>

          {loading ? (
            <SkeletonTable rows={6} />
          ) : (
            <>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Currency</th>
                    {col("nativePayouts") && <th className="p-2 text-right">Payouts (native)</th>}
                    {col("nativeRefunds") && <th className="p-2 text-right">Refunds (native)</th>}
                    {col("payouts") && <th className="p-2 text-right">Payouts ({displayCurrency})</th>}
                    {col("refunds") && <th className="p-2 text-right">Refunds ({displayCurrency})</th>}
                    {col("GMV") && canSeeFinance() && <th className="p-2 text-right">GMV ({displayCurrency})</th>}
                    {col("PlatformFee") && canSeeFinance() && (
                      <th className="p-2 text-right">Platform Fee ({displayCurrency})</th>
                    )}
                    {col("TutorNet") && canSeeFinance() && (
                      <th className="p-2 text-right">Tutor Net ({displayCurrency})</th>
                    )}
                    {col("net") && <th className="p-2 text-right">Net ({displayCurrency})</th>}
                  </tr>
                </thead>
                <tbody>
                  {byCurrencyDisplayConverted.map((r) => (
                    <tr
                      key={r.currency}
                      className="border-t cursor-pointer hover:bg-blue-50"
                      onClick={() => navigate(`/admin?tab=Refunds&currency=${r.currency}`)}
                      title="Open Refunds tab filtered by currency"
                    >
                      <td className="p-2">{r.currency}</td>
                      {col("nativePayouts") && <td className="p-2 text-right">{fmt(r.nativePayouts)}</td>}
                      {col("nativeRefunds") && <td className="p-2 text-right">{fmt(r.nativeRefunds)}</td>}
                      {col("payouts") && <td className="p-2 text-right">{fmt(r.payouts)}</td>}
                      {col("refunds") && <td className="p-2 text-right">{fmt(r.refunds)}</td>}
                      {col("GMV") && canSeeFinance() && <td className="p-2 text-right">{fmt(r.GMV)}</td>}
                      {col("PlatformFee") && canSeeFinance() && <td className="p-2 text-right">{fmt(r.PlatformFee)}</td>}
                      {col("TutorNet") && canSeeFinance() && <td className="p-2 text-right">{fmt(r.TutorNet)}</td>}
                      {col("net") && <td className="p-2 text-right">{fmt(r.net)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex gap-2 mt-2">
                <button
                  className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={() => {
                    const rows = byCurrencyDisplayConverted.map((r) => {
                      const base = {
                        Currency: r.currency,
                        DisplayCurrency: displayCurrency,
                        Payouts_Display: to2(r.payouts),
                        Refunds_Display: to2(r.refunds),
                        Net: to2(r.net),
                        NativePayouts: to2(r.nativePayouts),
                        NativeRefunds: to2(r.nativeRefunds),
                      };
                      if (!canSeeFinance()) return base;
                      return { ...base, GMV: to2(r.GMV), PlatformFee: to2(r.PlatformFee), TutorNet: to2(r.TutorNet) };
                    });
                    exportTableToCSV(rows, "gmv_by_currency.csv");
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={() => {
                    const rows = byCurrencyDisplayConverted.map((r) => {
                      const base = {
                        Currency: r.currency,
                        DisplayCurrency: displayCurrency,
                        Payouts_Display: to2(r.payouts),
                        Refunds_Display: to2(r.refunds),
                        Net: to2(r.net),
                        NativePayouts: to2(r.nativePayouts),
                        NativeRefunds: to2(r.nativeRefunds),
                      };
                      if (!canSeeFinance()) return base;
                      return { ...base, GMV: to2(r.GMV), PlatformFee: to2(r.PlatformFee), TutorNet: to2(r.TutorNet) };
                    });
                    exportTableToXLSX(rows, "gmv_by_currency.xlsx", "GMV_Currency");
                  }}
                >
                  Export XLSX
                </button>
              </div>
            </>
          )}
        </div>
        {/* ============================ Tutor Comparison =========================== */}
        {Array.isArray(summary.tutors) && summary.tutors.length > 0 && (
          <div className="bg-white rounded shadow p-4 overflow-auto">
            <h3>Tutor Comparison</h3>
            <button
              className="px-3 py-1 border rounded mt-2 focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={() => {
                const rows = summary.tutors.map((t) => ({
                  Tutor: t.name,
                  Lessons: t.lessons,
                  Earnings_Display: to2(cAmt(t.earnings || 0, t.currency || fx.base)),
                  Currency: displayCurrency,
                }));
                exportTableToCSV(rows, "tutor-finance.csv");
              }}
            >
              Export CSV
            </button>
            <button
              className="px-3 py-1 border rounded mt-2 ml-2 focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={() =>
                exportTableToXLSX(
                  summary.tutors.map((t) => ({
                    Tutor: t.name,
                    Lessons: t.lessons,
                    Earnings_Display: to2(cAmt(t.earnings || 0, t.currency || fx.base)),
                    Currency: displayCurrency,
                  })),
                  "tutor-finance.xlsx",
                  "Tutors"
                )
              }
            >
              Export XLSX
            </button>
            <table className="min-w-full text-sm border rounded-2xl mt-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Tutor</th>
                  <th className="p-2 text-right">Lessons</th>
                  <th className="p-2 text-right">Earnings ({displayCurrency})</th>
                </tr>
              </thead>
              <tbody>
                {summary.tutors.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t cursor-pointer hover:bg-blue-50"
                    onClick={() => navigate(`/admin?tab=Users&role=tutor&q=${encodeURIComponent(t.name)}`)}
                    title="Go to Tutors tab filtered to this tutor"
                  >
                    <td className="p-2">{t.name}</td>
                    <td className="p-2 text-right">{t.lessons}</td>
                    <td className="p-2 text-right">
                      {displayCurrency} {fmt(cAmt(t.earnings || 0, t.currency || fx.base))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================================= Tables ================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* By Day */}
          <div className="bg-white rounded shadow p-4 overflow-auto" aria-label="By Day table">
            <h3>By Day</h3>
            <div className="flex gap-2 my-2">
              <button
                onClick={() => exportTableToCSV(byDay, "byDay.csv")}
                className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportTableToXLSX(byDay, "byDay.xlsx", "ByDay")}
                className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Export XLSX
              </button>
            </div>
            {loading ? (
              <SkeletonTable rows={6} />
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-1">Date</th>
                    <th className="text-right p-1">Payouts ({displayCurrency})</th>
                    <th className="text-right p-1">Refunds ({displayCurrency})</th>
                    <th className="text-right p-1">Net ({displayCurrency})</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map((r) => (
                    <tr key={r.date} className="border-t">
                      <td className="p-1">{r.date}</td>
                      <td className="p-1 text-right">{fmt(r.payouts)}</td>
                      <td className="p-1 text-right">{fmt(r.refunds)}</td>
                      <td className="p-1 text-right">{fmt(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* By Tutor */}
          <div className="bg-white rounded shadow p-4 overflow-auto" aria-label="By Tutor table">
            <h3>By Tutor</h3>
            <div className="flex gap-2 my-2">
              <button
                onClick={() => exportTableToCSV(byTutor, "byTutor.csv")}
                className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportTableToXLSX(byTutor, "byTutor.xlsx", "ByTutor")}
                className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Export XLSX
              </button>
            </div>
            {loading ? (
              <SkeletonTable rows={6} />
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-1">Tutor</th>
                    <th className="text-right p-1">Payouts ({displayCurrency})</th>
                    <th className="text-right p-1">Refunds ({displayCurrency})</th>
                    <th className="text-right p-1">Net ({displayCurrency})</th>
                  </tr>
                </thead>
                <tbody>
                  {byTutor.map((r) => (
                    <tr key={r.tutor} className="border-t">
                      <td className="p-1">{r.tutor}</td>
                      <td className="p-1 text-right">{fmt(r.payouts)}</td>
                      <td className="p-1 text-right">{fmt(r.refunds)}</td>
                      <td className="p-1 text-right">{fmt(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* By Currency (simple net table) */}
          <div className="bg-white rounded shadow p-4 overflow-auto" aria-label="By Currency net table">
            <h3>By Currency</h3>
            <div className="flex gap-2 my-2">
              <button
                onClick={() =>
                  exportTableToCSV(
                    byCurrencyDisplayConverted.map((r) => ({
                      Currency: r.currency,
                      Payouts_Display: to2(r.payouts),
                      Refunds_Display: to2(r.refunds),
                      Net: to2(r.net),
                      DisplayCurrency: displayCurrency,
                    })),
                    "byCurrency.csv"
                  )
                }
                className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Export CSV
              </button>
              <button
                onClick={() =>
                  exportTableToXLSX(
                    byCurrencyDisplayConverted.map((r) => ({
                      Currency: r.currency,
                      Payouts_Display: to2(r.payouts),
                      Refunds_Display: to2(r.refunds),
                      Net: to2(r.net),
                      DisplayCurrency: displayCurrency,
                    })),
                    "byCurrency.xlsx",
                    "ByCurrency"
                  )
                }
                className="px-3 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Export XLSX
              </button>
            </div>
            {loading ? (
              <SkeletonTable rows={6} />
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-1">Currency</th>
                    <th className="text-right p-1">Payouts ({displayCurrency})</th>
                    <th className="text-right p-1">Refunds ({displayCurrency})</th>
                    <th className="text-right p-1">Net ({displayCurrency})</th>
                  </tr>
                </thead>
                <tbody>
                  {byCurrencyDisplayConverted.map((r) => (
                    <tr key={r.currency} className="border-t">
                      <td className="p-1">{r.currency}</td>
                      <td className="p-1 text-right">{fmt(r.payouts)}</td>
                      <td className="p-1 text-right">{fmt(r.refunds)}</td>
                      <td className="p-1 text-right">{fmt(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ========================= Commission Breakdowns ========================= */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded shadow p-4 overflow-auto">
            <h3>Commission by Tutor</h3>
            {loading ? (
              <SkeletonTable rows={6} />
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-1">Tutor</th>
                    <th className="text-right p-1">Commission ({displayCurrency})</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionByTutor.map((r) => (
                    <tr key={r.tutor} className="border-t">
                      <td className="p-1">{r.tutor}</td>
                      <td className="p-1 text-right">{fmt(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded shadow p-4 overflow-auto">
            <h3>Commission by Currency</h3>
            {loading ? (
              <SkeletonTable rows={6} />
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-1">Currency</th>
                    <th className="text-right p-1">Commission ({displayCurrency})</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionByCurrency.map((r) => (
                    <tr key={r.currency} className="border-t">
                      <td className="p-1">{r.currency}</td>
                      <td className="p-1 text-right">{fmt(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ============================== Queues / Fails ============================== */}
        <div className="grid grid-cols-2 gap-4">
          {/* Queued Payouts */}
          <div className="bg-white rounded shadow p-4">
            <h3>Queued Payouts</h3>
            {loading ? (
              <SkeletonTable rows={4} />
            ) : queuedPayouts.length ? (
              queuedPayouts.map((p) => (
                <div key={p.id} className="flex justify-between items-center border p-1 my-1 rounded">
                  <div className="text-sm">
                    <b>{p.id}</b> • {p.tutor?.name || p.tutor || "Unknown"} • {displayCurrency}{" "}
                    {fmt(cAmt(p.amount, p.currency))}
                  </div>
                  <button
                    onClick={() => approvePayout(p.id)}
                    className="px-2 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    Approve
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">None</div>
            )}
          </div>

          {/* Queued Refunds */}
          <div className="bg-white rounded shadow p-4">
            <h3>Queued Refunds</h3>
            {loading ? (
              <SkeletonTable rows={4} />
            ) : queuedRefunds.length ? (
              queuedRefunds.map((r) => (
                <div key={r.id} className="flex justify-between items-center border p-1 my-1 rounded">
                  <div className="text-sm">
                    <b>{r.id}</b> • {r.student?.name || r.student || "Student"} → {r.tutor?.name || r.tutor || "Tutor"} •{" "}
                    {displayCurrency} {fmt(cAmt(r.amount, r.currency))}
                  </div>
                  <button
                    onClick={() => denyRefund(r.id)}
                    className="px-2 py-1 border rounded focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    Deny
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">None</div>
            )}
          </div>

          {/* Failed Payouts */}
          <div className="bg-white rounded shadow p-4">
            <h3>Failed Payouts</h3>
            {loading ? (
              <SkeletonTable rows={3} />
            ) : failedPayouts.length ? (
              failedPayouts.map((p) => (
                <div key={p.id} className="border p-1 my-1 rounded text-sm">
                  {p.id} • {p.tutor?.name || p.tutor || "Unknown"} • {displayCurrency} {fmt(cAmt(p.amount, p.currency))}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">None</div>
            )}
          </div>

          {/* Failed Refunds */}
          <div className="bg-white rounded shadow p-4">
            <h3>Failed Refunds</h3>
            {loading ? (
              <SkeletonTable rows={3} />
            ) : failedRefunds.length ? (
              failedRefunds.map((r) => (
                <div key={r.id} className="border p-1 my-1 rounded text-sm">
                  {r.id} • {r.student?.name || r.student || "Student"} → {r.tutor?.name || r.tutor || "Tutor"} •{" "}
                  {displayCurrency} {fmt(cAmt(r.amount, r.currency))}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">None</div>
            )}
          </div>
        </div>

        {/* ========================= Additional Diagnostics ========================= */}
        <div className="bg-white border rounded-2xl p-4">
          <details>
            <summary className="cursor-pointer font-semibold">Diagnostics</summary>
            <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm">
              <div className="border rounded p-3">
                <div>
                  <b>Rows (Filtered)</b>
                </div>
                <div>Payouts: {fmt0(fPayouts.length)} | Refunds: {fmt0(fRefunds.length)}</div>
                <div>
                  Queued Payouts: {fmt0(queuedPayouts.length)} | Queued Refunds: {fmt0(queuedRefunds.length)}
                </div>
                <div>
                  Failed Payouts: {fmt0(failedPayouts.length)} | Failed Refunds: {fmt0(failedRefunds.length)}
                </div>
              </div>
              <div className="border rounded p-3">
                <div>
                  <b>Numbers (Display Currency: {displayCurrency})</b>
                </div>
                <div>Payouts: {fmt(totalPayouts)}</div>
                <div>Refunds: {fmt(totalRefunds)}</div>
                <div>GMV (approx): {fmt(gmv)}</div>
                <div>Platform Fee: {fmt(platformFee)}</div>
                <div>Tutor Net: {fmt(tutorNet)}</div>
              </div>
              {loadError && (
                <div className="border rounded p-3 text-red-600">
                  <b>Error:</b> {loadError}
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </ErrorBoundary>
  );
}
