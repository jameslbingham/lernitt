// client/src/pages/Availability.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DRAFT_KEY = "availability:draft";

/**
 * LERNITT ACADEMY - SOPHISTICATED SCHEDULING PROTOCOL v3.2.0
 * ----------------------------------------------------------------------------
 * CORE LOGIC:
 * - BuildTimeOptions: Generates 15-minute increments for 24-hour selection.
 * - Validation: Checks for logical start/end times and prevents overlapping slots.
 * - WeekPreview: Maps rules to a calendar view for student simulation.
 * - Draft Engine: Auto-saves local changes to prevent data loss on refresh.
 * ----------------------------------------------------------------------------
 */

function buildTimeOptions() {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const v24 = `${hh}:${mm}`;
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "am" : "pm";
      opts.push({ value: v24, label: `${v24}  (${h12}:${mm} ${ampm})` });
    }
  }
  return opts;
}

function TimeSelect({ value, onChange, aria }) {
  const options = useMemo(buildTimeOptions, []);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={aria}
      className="border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
      style={{ minWidth: 170, padding: 6 }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RangeRow({ range, onChange, onRemove }) {
  return (
    <div
      className="items-center"
      style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}
    >
      <TimeSelect
        value={range.start}
        onChange={(v) => onChange({ ...range, start: v })}
        aria="Start time"
      />
      <span className="text-slate-400 font-bold">→</span>
      <TimeSelect
        value={range.end}
        onChange={(v) => onChange({ ...range, end: v })}
        aria="End time"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove range"
        className="border px-4 py-1.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        Remove
      </button>
    </div>
  );
}

/* ---------- SOPHISTICATED VALIDATION ENGINE ---------- */

function cmpTime(a, b) {
  // Lexicographic compare for HH:MM format
  return a.localeCompare(b);
}

function validatePerDayRules(rulesByDay) {
  const errs = [];
  rulesByDay.forEach((ranges, di) => {
    ranges.forEach((r, i) => {
      if (!r.start || !r.end)
        errs.push(`${DAYS[di]} range #${i + 1}: set both start and end time`);
      if (r.start && r.end && cmpTime(r.start, r.end) >= 0)
        errs.push(`${DAYS[di]} range #${i + 1}: start must be before end`);
    });
    const sorted = [...ranges].sort((a, b) => cmpTime(a.start, b.start));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (cmpTime(cur.start, prev.end) < 0) {
        errs.push(
          `${DAYS[di]} overlap: ${prev.start}–${prev.end} and ${cur.start}–${cur.end}`
        );
      }
    }
  });
  return errs;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function dayIndexMon0(date) {
  // Normalizes JS getDay() (Sun=0) to Lernitt Protocol (Mon=0)
  const js = date.getDay(); 
  return (js + 6) % 7; 
}

/* ---------- RULES ⇄ WEEKLY TRANSFORMERS ---------- */

function weeklyFromRules(rules) {
  const out = [];
  (rules || []).forEach((rangesForDay, di) => {
    if (!rangesForDay || rangesForDay.length === 0) return;
    // Transform Mon=0..Sun=6 Lernitt index to standard Cron/System dow (Sun=0..Sat=6)
    const dow = di === 6 ? 0 : di + 1;
    out.push({
      dow,
      ranges: rangesForDay.map((r) => ({
        start: r.start,
        end: r.end,
      })),
    });
  });
  return out;
}

function rulesFromWeekly(weekly) {
  const rules = DAYS.map(() => []);
  (weekly || []).forEach((w) => {
    let di;
    if (w.dow === 0) di = 6; // Sunday
    else di = w.dow - 1; // 1..6 → Mon..Sat
    if (di < 0 || di > 6) return;

    const dayRanges = (w.ranges || []).map((r) => ({
      start: (r.start || "00:00").slice(0, 5),
      end: (r.end || "23:45").slice(0, 5),
    }));

    rules[di] = dayRanges;
  });
  return rules;
}

/* -------------------- MAIN COMPONENT -------------------- */

export default function Availability() {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // STATE CONFIGURATION
  const [timezone, setTimezone] = useState(browserTz);
  const [bookingNotice, setBookingNotice] = useState(12); // ✅ New sophistication
  const [rules, setRules] = useState(
    DAYS.map(() => [{ start: "09:00", end: "12:00" }])
  );

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today); 
  const [repeat, setRepeat] = useState("weekly"); 
  const [untilMode, setUntilMode] = useState("always"); 
  const [untilDate, setUntilDate] = useState(""); 

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  // DRAFT ENGINE: Local persistence to survive reloads/crashes
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return !!localStorage.getItem(DRAFT_KEY);
    } catch { return false; }
  });

  async function loadFromSource() {
    setError("");
    try {
      if (MOCK) {
        const tzSaved = localStorage.getItem("availabilityTz");
        const rs = localStorage.getItem("availabilityRules");
        const sd = localStorage.getItem("availabilityStartDate");
        const rp = localStorage.getItem("availabilityRepeat");
        const um = localStorage.getItem("availabilityUntilMode");
        const ud = localStorage.getItem("availabilityUntilDate");
        if (tzSaved) setTimezone(tzSaved);
        if (rs) {
          const parsed = JSON.parse(rs);
          if (Array.isArray(parsed) && parsed.length === 7) setRules(parsed);
        }
        if (sd) setStartDate(sd);
        if (rp) setRepeat(rp);
        if (um) setUntilMode(um);
        if (ud) setUntilDate(ud);
      } else {
        // PRODUCTION SYNC
        const data = await apiFetch("/api/availability/me", { auth: true });

        setTimezone(data.timezone || browserTz);
        setBookingNotice(data.bookingNotice || 12);

        if (Array.isArray(data.weekly) && data.weekly.length > 0) {
          setRules(rulesFromWeekly(data.weekly));
        } else if (Array.isArray(data.rules) && data.rules.length === 7) {
          setRules(data.rules);
        }

        if (data.startDate) setStartDate(data.startDate);
        if (data.repeat) setRepeat(data.repeat);
        if (data.untilMode) setUntilMode(data.untilMode);
        if (data.untilDate) setUntilDate(data.untilDate);
      }
      setDirty(false);
      setMsg("");
    } catch (e) {
      setError(e?.message || "Failed to load availability from Lernitt server.");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadFromSource();
      setLoaded(true);
      setLoading(false);
    })();
  }, []);

  function markDirtyAnd(fn) {
    return (...args) => {
      setDirty(true);
      fn(...args);
    };
  }

  // AUTO-DRAFT: Saves state to localStorage on every change
  useEffect(() => {
    if (!loaded) return;
    try {
      const payload = {
        timezone, bookingNotice, rules, startDate, repeat, untilMode, untilDate, _ts: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setHasDraft(true);
    } catch {}
  }, [timezone, bookingNotice, rules, startDate, repeat, untilMode, untilDate, loaded]);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d) return;
      if (d.timezone) setTimezone(d.timezone);
      if (d.bookingNotice) setBookingNotice(d.bookingNotice);
      if (Array.isArray(d.rules) && d.rules.length === 7) setRules(d.rules);
      if (d.startDate) setStartDate(d.startDate);
      if (d.repeat) setRepeat(d.repeat);
      if (d.untilDate !== undefined) setUntilDate(d.untilDate);
      setDirty(true);
      setMsg("Sophisticated draft restored (not yet saved to cloud).");
    } catch {}
  }

  function resetDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setMsg("Draft cache cleared.");
    } catch {}
  }

  async function onRefresh() {
    setLoading(true);
    await loadFromSource();
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    setError("");

    const payload = {
      timezone,
      bookingNotice,
      weekly: weeklyFromRules(rules),
      rules, 
      startDate, 
      repeat, 
      untilMode, 
      untilDate: untilMode === "until" ? untilDate : "",
    };

    try {
      if (MOCK) {
        localStorage.setItem("availabilityTz", timezone);
        localStorage.setItem("availabilityRules", JSON.stringify(rules));
        localStorage.setItem("availabilityStartDate", startDate);
        localStorage.setItem("availabilityRepeat", repeat);
        localStorage.setItem("availabilityUntilMode", untilMode);
        localStorage.setItem("availabilityUntilDate", untilDate);
      } else {
        await apiFetch("/api/availability", {
          method: "PUT",
          auth: true,
          body: payload,
        });
      }
      setMsg("Availability is live. Tutors can now be booked.");
      setDirty(false);
      try {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
      } catch {}
    } catch (e) {
      setError(e?.message || "Could not save. Check network connection.");
    } finally {
      setSaving(false);
    }
  }

  // DAY-LEVEL MUTATIONS
  const addRange = (di) => markDirtyAnd(() => {
    const c = [...rules];
    c[di] = [...c[di], { start: "14:00", end: "18:00" }];
    setRules(c);
  })();

  const updateRange = (di, idx, nr) => markDirtyAnd(() => {
    const c = [...rules];
    c[di] = c[di].map((r, i) => (i === idx ? nr : r));
    setRules(c);
  })();

  const removeRange = (di, idx) => markDirtyAnd(() => {
    const c = [...rules];
    c[di] = c[di].filter((_, i) => i !== idx);
    setRules(c);
  })();

  const validation = useMemo(() => validatePerDayRules(rules), [rules]);

  /* ---------- SOPHISTICATED WEEK PREVIEW ---------- */

  const todayStart = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(todayStart);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  function isDateWithinWindow(d) {
    const ymdStr = ymd(d);
    if (ymdStr < startDate) return false;
    if (untilMode === "until" && untilDate && ymdStr > untilDate) return false;
    return true;
  }

  const weekPreview = useMemo(() => {
    const map = {}; 
    for (const day of days) {
      const key = ymd(day);
      map[key] = [];
      if (!isDateWithinWindow(day)) continue;

      const di = dayIndexMon0(day);
      const startWeekday = dayIndexMon0(new Date(startDate + "T00:00:00"));

      if (repeat === "none" && di !== startWeekday) continue;
      map[key] = rules[di] || [];
    }
    return map;
  }, [days, rules, startDate, repeat, untilMode, untilDate]);

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-100 rounded-2xl" />
        <div className="h-24 w-full bg-slate-100 rounded-3xl" />
        <div className="h-64 w-full bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  const startDayLabel = new Date(startDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" });

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      {/* HEADER SECTION */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              <Link to="/tutor" className="inline-flex items-center gap-1 hover:underline">
                ← Back to tutor dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Availability Setup</h1>
            <p className="text-sm text-slate-600 font-medium">Set your working hours. Students book in their local time automatically.</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Timezone Engine:</span>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{timezone}</span>
              {timezone !== browserTz && (
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                  ⚠️ System Drift: Browser is {browserTz}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link to="/payouts" className="text-xs font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 px-4 py-1.5 rounded-2xl hover:bg-indigo-100 transition shadow-sm">
              Next: payouts & pricing →
            </Link>
            <div className="flex gap-2">
              <button onClick={onRefresh} className="border px-4 py-1.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition">
                Refresh
              </button>
              <button 
                onClick={save} 
                disabled={saving || validation.length > 0 || !dirty} 
                className="bg-slate-900 text-white px-6 py-1.5 rounded-2xl text-sm font-black disabled:opacity-30 shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {saving ? "Saving..." : dirty ? "Save Changes" : "Saved"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm font-bold animate-shake">{error}</div>}
      {msg && !error && <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-sm font-bold animate-fade-in">✅ {msg}</div>}

      {/* CORE CONTROLS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Schedule Window Panel */}
        <section className="border border-slate-200 rounded-[2rem] p-8 bg-slate-50/50 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">🗓️</div>
            <h3 className="font-black text-lg text-slate-800">Booking Window</h3>
          </div>
          <div className="space-y-6">
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Schedule Start Date</span>
              <input type="date" value={startDate} min={today} onChange={markDirtyAnd((e) => setStartDate(e.target.value))} className="w-full border rounded-2xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"/>
            </label>
            
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Repeat Frequency</span>
              <select value={repeat} onChange={markDirtyAnd((e) => setRepeat(e.target.value))} className="w-full border rounded-2xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700">
                <option value="weekly">{`Every ${startDayLabel}`}</option>
                <option value="none">One day only (No repeat)</option>
              </select>
            </label>

            <div className="pt-4 border-t border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Availability Expiry</span>
              <div className="flex gap-6 items-center">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                  <input type="radio" checked={untilMode === "always"} onChange={markDirtyAnd(() => setUntilMode("always"))} className="w-4 h-4 accent-indigo-600"/> Always
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                  <input type="radio" checked={untilMode === "until"} onChange={markDirtyAnd(() => setUntilMode("until"))} className="w-4 h-4 accent-indigo-600"/> Until
                </label>
                {untilMode === "until" && (
                  <input type="date" value={untilDate} min={startDate} onChange={markDirtyAnd((e) => setUntilDate(e.target.value))} className="border rounded-xl p-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"/>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sophisticated Guardrails Panel */}
        <section className="border border-slate-200 rounded-[2rem] p-8 bg-slate-50/50 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">🛡️</div>
            <h3 className="font-black text-lg text-slate-800">Advanced Safeguards</h3>
          </div>
          <div className="space-y-6">
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Timezone Lock (IANA Protocol)</span>
              <input value={timezone} onChange={markDirtyAnd((e) => setTimezone(e.target.value))} className="w-full border rounded-2xl p-3 font-mono text-xs font-bold text-slate-700 bg-white"/>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Prevents browser-based schedule shifting.</p>
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Minimum Booking Lead-Time</span>
              <select value={bookingNotice} onChange={markDirtyAnd((e) => setBookingNotice(Number(e.target.value)))} className="w-full border rounded-2xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700">
                <option value={1}>1 Hour (Urgent)</option>
                <option value={6}>6 Hours (Balanced)</option>
                <option value={12}>12 Hours (Standard)</option>
                <option value={24}>24 Hours (Recommended)</option>
                <option value={48}>48 Hours (Strict)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Stops students from booking last-minute lessons.</p>
            </label>
          </div>
        </section>
      </div>

      {/* VALIDATION PANEL */}
      {validation.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-[2rem] mt-8">
          <p className="font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span> Conflict Detection Active:
          </p>
          <ul className="list-disc ml-5 space-y-2 font-bold text-sm">
            {validation.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* PER-DAY RULE EDITORS */}
      <div className="mt-12 space-y-8">
        <h2 className="text-xl font-black text-slate-900 border-b-2 border-slate-100 pb-4">Standard Weekly Availability</h2>
        
        {DAYS.map((d, di) => (
          <div key={d} className="group relative bg-white hover:bg-slate-50/50 p-6 rounded-[2rem] transition-all border border-transparent hover:border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-baseline gap-4">
                <h3 className="font-black text-3xl text-slate-900 tracking-tighter w-20">{d}</h3>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">
                  {rules[di].length === 0 ? "Unavailable" : `${rules[di].length} active blocks`}
                </span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => addRange(di)} className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-900 hover:text-white transition shadow-sm">
                  + Add Range
                </button>
                <button 
                  onClick={markDirtyAnd(() => {
                    const c = [...rules];
                    c[di] = [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }];
                    setRules(c);
                  })} 
                  className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition shadow-sm"
                >
                  Quick: Split Shift
                </button>
                <button 
                  onClick={markDirtyAnd(() => {
                    const c = [...rules];
                    c[di] = [{ start: "00:00", end: "23:45" }];
                    setRules(c);
                  })} 
                  className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition shadow-sm"
                >
                  Quick: All Day
                </button>
              </div>
            </div>

            {rules[di].length === 0 ? (
              <div className="py-4 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-300 font-bold text-sm">
                No availability set for {d}.
              </div>
            ) : (
              <div className="space-y-3">
                {rules[di].map((range, idx) => (
                  <RangeRow 
                    key={idx} 
                    range={range} 
                    onChange={(nr) => updateRange(di, idx, nr)} 
                    onRemove={() => removeRange(di, idx)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SOPHISTICATED STUDENT VIEW PREVIEW */}
      <div className="mt-20 p-10 bg-slate-900 rounded-[3rem] text-white shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="font-black text-2xl tracking-tight">Student Marketplace Preview</h3>
            <p className="text-[10px] text-white/40 mt-2 uppercase tracking-[0.2em] font-black">Live synchronization engine v3.2</p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-full border border-white/10">
            <button 
              onClick={() => setWeekStart(addDays(weekStart, -7))} 
              className="hover:bg-white/10 p-3 rounded-full transition text-xl leading-none"
              aria-label="Previous week"
            >
              ←
            </button>
            <span className="text-xs font-black font-mono px-4 tracking-widest">
              {weekStart.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {addDays(weekStart, 6).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
            </span>
            <button 
              onClick={() => setWeekStart(addDays(weekStart, 7))} 
              className="hover:bg-white/10 p-3 rounded-full transition text-xl leading-none"
              aria-label="Next week"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4 overflow-x-auto pb-6">
          {days.map((d) => {
            const key = ymd(d);
            const ranges = weekPreview[key] || [];
            const isLive = isDateWithinWindow(d);
            const isToday = ymd(new Date()) === key;

            return (
              <div 
                key={key} 
                className={`min-w-[140px] p-6 rounded-[2.5rem] border transition-all duration-500 
                  ${isLive ? (isToday ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 bg-white/5 hover:border-white/40') : 'border-white/5 opacity-10 blur-[1px]'}`}
              >
                <p className={`text-[10px] uppercase font-black mb-1 ${isToday ? 'text-indigo-400' : 'text-white/30'}`}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="text-3xl font-black mb-6">{d.getDate()}</p>
                <div className="space-y-2">
                  {ranges.length === 0 ? (
                    <div className="h-1 w-4 bg-white/10 rounded-full" />
                  ) : (
                    ranges.map((r, i) => (
                      <div 
                        key={i} 
                        className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 rounded-xl px-3 py-2 border border-indigo-500/30 whitespace-nowrap"
                      >
                        {r.start} - {r.end}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-white/20 mt-6 font-bold text-center uppercase tracking-widest">
          Times automatically converted to student's detected local timezone
        </p>
      </div>

      {/* FOOTER UTILITY BAR */}
      <div className="mt-16 border-t border-slate-100 pt-10 flex flex-wrap items-center justify-between gap-6">
        <div className="flex gap-6 items-center">
          <div className="flex gap-2">
            {hasDraft && (
              <button 
                onClick={restoreDraft} 
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition"
              >
                Restore Draft
              </button>
            )}
            <button 
              onClick={resetDraft} 
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition"
            >
              Clear Cache
            </button>
          </div>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">
            {dirty ? "Unsaved changes detected" : "All changes synced to cloud"}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => {
              const summary = JSON.stringify({ timezone, bookingNotice, rules, startDate, repeat, untilMode, untilDate }, null, 2);
              navigator.clipboard.writeText(summary); 
              alert("Lernitt Availability Protocol JSON copied to clipboard.");
            }} 
            className="text-[10px] font-black bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl hover:bg-slate-200 transition shadow-sm"
          >
            Copy JSON Summary
          </button>
          <button 
            onClick={() => {
               const blob = new Blob([JSON.stringify({ timezone, bookingNotice, rules, startDate, repeat, untilMode, untilDate }, null, 2)], { type: "application/json" });
               const url = URL.createObjectURL(blob); 
               const a = document.createElement("a"); 
               a.href = url; a.download = "availability-config.json"; 
               a.click(); 
               URL.revokeObjectURL(url);
            }} 
            className="text-[10px] font-black bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition shadow-lg"
          >
            Export as .JSON file
          </button>
        </div>
      </div>
      
      <div className="mt-10 text-center">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mb-4">Lernitt Academy</p>
        <Link to="/tutor" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition underline underline-offset-4 decoration-2">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
