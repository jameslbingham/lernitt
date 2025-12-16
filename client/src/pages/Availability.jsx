// client/src/pages/Availability.jsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/apiFetch.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DRAFT_KEY = "availability:draft";

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
      className="border rounded-xl"
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
      <TimeSelect value={range.start} onChange={(v) => onChange({ ...range, start: v })} aria="Start time" />
      <span>→</span>
      <TimeSelect value={range.end} onChange={(v) => onChange({ ...range, end: v })} aria="End time" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove range"
        className="border px-3 py-1 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 hover:shadow-sm"
      >
        Remove
      </button>
    </div>
  );
}

/* ---------- helpers for validation & preview ---------- */

function cmpTime(a, b) {
  // "HH:MM" lexicographic compare works, but be explicit
  return a.localeCompare(b);
}

function validatePerDayRules(rulesByDay) {
  // rulesByDay: Array< Array<{start,end}> >
  const errs = [];
  rulesByDay.forEach((ranges, di) => {
    // empty day is fine
    ranges.forEach((r, i) => {
      if (!r.start || !r.end) errs.push(`${DAYS[di]} range #${i + 1}: set both start and end time`);
      if (r.start && r.end && cmpTime(r.start, r.end) >= 0)
        errs.push(`${DAYS[di]} range #${i + 1}: start must be before end`);
    });
    const sorted = [...ranges].sort((a, b) => cmpTime(a.start, b.start));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      // overlap if cur.start < prev.end
      if (cmpTime(cur.start, prev.end) < 0) {
        errs.push(`${DAYS[di]} overlap: ${prev.start}–${prev.end} and ${cur.start}–${cur.end}`);
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
  // DAYS starts Mon..Sun; JS getDay() is Sun=0..Sat=6.
  const js = date.getDay(); // 0..6
  return (js + 6) % 7; // 0..6 with Mon=0
}

/* ---------- NEW: rules ⇄ weekly helpers ---------- */

function weeklyFromRules(rules) {
  const out = [];
  (rules || []).forEach((rangesForDay, di) => {
    if (!rangesForDay || rangesForDay.length === 0) return;
    // Mon=0..Sat=5, Sun=6  →  dow: Mon=1..Sat=6, Sun=0
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
    else di = w.dow - 1;     // 1..6 → Mon..Sat
    if (di < 0 || di > 6) return;

    const dayRanges = (w.ranges || []).map((r) => ({
      start: (r.start || "00:00").slice(0, 5),
      end: (r.end || "23:45").slice(0, 5),
    }));

    rules[di] = dayRanges;
  });
  return rules;
}

/* -------------------- page -------------------- */

export default function Availability() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const [timezone, setTimezone] = useState(tz);
  const [rules, setRules] = useState(DAYS.map(() => [{ start: "09:00", end: "12:00" }]));

  // Repeat controls (existing)
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today); // YYYY-MM-DD
  const [repeat, setRepeat] = useState("weekly"); // "weekly" | "none"
  const [untilMode, setUntilMode] = useState("always"); // "always" | "until"
  const [untilDate, setUntilDate] = useState(""); // YYYY-MM-DD or ""

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  // Draft presence for restore
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return !!localStorage.getItem(DRAFT_KEY);
    } catch {
      return false;
    }
  });

  // Extracted loader so we can refresh
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
        // ✅ LIVE: use apiFetch so JWT is sent
        const data = await apiFetch("/api/availability/me", { auth: true });

        setTimezone(data.timezone || timezone);

        if (Array.isArray(data.weekly) && data.weekly.length > 0) {
          // NEW: source of truth in Mongo → convert to UI rules
          setRules(rulesFromWeekly(data.weekly));
        } else if (Array.isArray(data.rules) && data.rules.length === 7) {
          // backward-compat if we ever stored rules directly
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
      setError(e?.message || "Failed to load availability");
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

  // Mark dirty on edits + write draft
  function markDirtyAnd(fn) {
    return (...args) => {
      setDirty(true);
      fn(...args);
    };
  }

  // Autosave draft on any key state change
  useEffect(() => {
    if (!loaded) return;
    try {
      const payload = {
        timezone,
        rules,
        startDate,
        repeat,
        untilMode,
        untilDate,
        _ts: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setHasDraft(true);
    } catch {}
  }, [timezone, rules, startDate, repeat, untilMode, untilDate, loaded]);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d) return;
      if (d.timezone) setTimezone(d.timezone);
      if (Array.isArray(d.rules) && d.rules.length === 7) setRules(d.rules);
      if (d.startDate) setStartDate(d.startDate);
      if (d.repeat) setRepeat(d.repeat);
      if (d.untilMode) setUntilMode(d.untilMode);
      if (d.untilDate !== undefined) setUntilDate(d.untilDate);
      setDirty(true);
      setMsg("Draft restored (not yet saved).");
    } catch {}
  }

  function resetDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setMsg("Draft cleared.");
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
      weekly: weeklyFromRules(rules),      // NEW: what the backend actually uses
      // keep UI fields (ignored by backend, but harmless)
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
        // ✅ LIVE: use apiFetch so JWT is sent
        await apiFetch("/api/availability", {
          method: "PUT",
          auth: true,
          body: payload,
        });
      }
      setMsg("Saved!");
      setDirty(false);
      // clear draft on successful save
      try {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
      } catch {}
    } catch (e) {
      setMsg("");
      setError(e?.message || "Could not save. Try later.");
    } finally {
      setSaving(false);
    }
  }

  // Per-day rule mutations (mark dirty)
  const addRange = (di) =>
    markDirtyAnd(() => {
      const c = [...rules];
      c[di] = [...c[di], { start: "14:00", end: "18:00" }];
      setRules(c);
    })();

  const updateRange = (di, idx, nr) =>
    markDirtyAnd(() => {
      const c = [...rules];
      c[di] = c[di].map((r, i) => (i === idx ? nr : r));
      setRules(c);
    })();

  const removeRange = (di, idx) =>
    markDirtyAnd(() => {
      const c = [...rules];
      c[di] = c[di].filter((_, i) => i !== idx);
      setRules(c);
    })();

  // Validation
  const validation = useMemo(() => validatePerDayRules(rules), [rules]);

  /* -------------------- Week preview (ranges summary) -------------------- */

  const todayStart = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(todayStart);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Compute which days are within window: starts at startDate, and (if untilMode=until) untilDate
  function isDateWithinWindow(d) {
    const ymdStr = ymd(d);
    if (ymdStr < startDate) return false;
    if (untilMode === "until" && untilDate && ymdStr > untilDate) return false;
    return true;
  }

  // Generate a simple preview: show each day's configured ranges (not expanding into slots).
  // Honors repeat = weekly (repeats every week) or none (only startDate's weekday).
  const weekPreview = useMemo(() => {
    const map = {}; // key: 'YYYY-MM-DD' -> [{start,end}]
    for (const day of days) {
      const key = ymd(day);
      map[key] = [];
      if (!isDateWithinWindow(day)) continue;

      const di = dayIndexMon0(day); // 0..6 for Mon..Sun
      const startWeekday = dayIndexMon0(new Date(startDate + "T00:00:00"));

      if (repeat === "none") {
        // only the exact weekday of startDate
        if (di !== startWeekday) continue;
      }
      // weekly repeat (default): use the day's ranges
      const ranges = rules[di] || [];
      map[key] = ranges;
    }
    return map;
  }, [days, rules, startDate, repeat, untilMode, untilDate]);

  /* -------------------- Render -------------------- */

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="border rounded-2xl p-3 space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-64 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded" />
        </div>
        <div className="border rounded-2xl p-3 space-y-2">
          <div className="h-4 w-56 bg-gray-200 rounded" />
          <div className="h-3 w-72 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded" />
        </div>
        <div className="border rounded-2xl p-3 space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-60 bg-gray-200 rounded" />
          <div className="h-3 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const startDayLabel = new Date(startDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
  });

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      {/* Sticky header + actions */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Availability</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh from server"
              className="border px-3 py-1 rounded-2xl text-sm shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || validation.length > 0 || !dirty}
              aria-label="Save availability"
              className="border px-3 py-1 rounded-2xl text-sm shadow-sm hover:shadow-md transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            padding: "6px 8px",
            fontSize: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#eff6ff",
          }}
        >
          Times are shown in your timezone: {tz}.
        </div>
      </div>

      {/* Status messages */}
      {error && <div className="text-red-600 mt-3">{error}</div>}
      {msg && !error && <div className="text-green-700 mt-3">{msg}</div>}

      {/* Schedule window (existing, lightly styled) */}
      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, marginTop: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Schedule window</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Start date{" "}
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={markDirtyAnd((e) => setStartDate(e.target.value))}
              aria-label="Start date"
              className="border rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
          <label>
            Repeat{" "}
            <select
              value={repeat}
              onChange={markDirtyAnd((e) => setRepeat(e.target.value))}
              aria-label="Repeat pattern"
              className="border rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="weekly">{`Every ${startDayLabel}`}</option>
              <option value="none">Doesn't repeat (one day only)</option>
            </select>
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="until"
              checked={untilMode === "always"}
              onChange={markDirtyAnd(() => setUntilMode("always"))}
            />{" "}
            Always
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="until"
              checked={untilMode === "until"}
              onChange={markDirtyAnd(() => setUntilMode("until"))}
            />{" "}
            Until
            <input
              type="date"
              disabled={untilMode !== "until"}
              value={untilDate}
              min={startDate}
              onChange={markDirtyAnd((e) => setUntilDate(e.target.value))}
              aria-label="Until date"
              className="border rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
            />
          </label>
        </div>
        <div style={{ opacity: 0.7, marginTop: 6 }}>Students can book only within this window.</div>
      </div>

      {/* Timezone (existing) */}
      <label style={{ display: "block", marginBottom: 8 }}>
        Timezone (IANA, e.g., Europe/Madrid)
        <input
          value={timezone}
          onChange={markDirtyAnd((e) => setTimezone(e.target.value))}
          style={{ display: "block", width: "100%", maxWidth: 360, marginTop: 4 }}
          aria-label="Timezone"
          className="border rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </label>

      <p style={{ margin: "8px 0 12px" }}>
        Pick exact times from <b>00:00 → 23:45</b> (15-minute steps). Shows 24-hour and am/pm.
      </p>

      {/* Validation panel */}
      {validation.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-2xl p-2 text-sm mb-2">
          <div className="font-semibold mb-1">Please fix:</div>
          <ul className="list-disc ml-5">
            {validation.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-day editors (existing, with a11y & dirty tracking) */}
      {DAYS.map((d, di) => (
        <div key={d} style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
          <h3 style={{ marginBottom: 8 }}>{d}</h3>
          {rules[di].length === 0 && <div style={{ opacity: 0.7, marginBottom: 6 }}>No hours</div>}
          {rules[di].map((range, idx) => (
            <RangeRow
              key={idx}
              range={range}
              onChange={(nr) => updateRange(di, idx, nr)}
              onRemove={() => removeRange(di, idx)}
            />
          ))}
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => addRange(di)}
              aria-label={`Add time range for ${d}`}
              className="border px-3 py-1 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 hover:shadow-sm"
            >
              Add range
            </button>
            <button
              type="button"
              onClick={markDirtyAnd(() => {
                const c = [...rules];
                c[di] = [
                  { start: "09:00", end: "12:00" },
                  { start: "14:00", end: "18:00" },
                ];
                setRules(c);
              })}
              aria-label={`Quick ranges 09–12 and 14–18 for ${d}`}
              className="border px-3 py-1 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 hover:shadow-sm"
            >
              Quick: 09–12 & 14–18
            </button>
            <button
              type="button"
              onClick={markDirtyAnd(() => {
                const c = [...rules];
                c[di] = [{ start: "00:00", end: "23:45" }];
                setRules(c);
              })}
              aria-label={`Open all day for ${d}`}
              className="border px-3 py-1 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 hover:shadow-sm"
            >
              Open all day
            </button>
          </div>
        </div>
      ))}

      {/* Save row */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={save}
          disabled={saving || validation.length > 0 || !dirty}
          className="border px-3 py-1 rounded-2xl text-sm shadow-sm hover:shadow-md transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Save availability"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <span>{msg}</span>}
      </div>

      {/* Utilities: draft, copy/export JSON */}
      <div className="mt-4 flex flex-wrap gap-2">
        {hasDraft && (
          <>
            <button
              type="button"
              onClick={restoreDraft}
              className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              Restore draft
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              Clear draft
            </button>
          </>
        )}
        <button
          type="button"
          onClick={async () => {
            const summary = JSON.stringify({ timezone, rules, startDate, repeat, untilMode, untilDate, tz }, null, 2);
            try {
              await navigator.clipboard.writeText(summary);
              alert("Availability JSON copied!");
            } catch {
              alert("Copy failed");
            }
          }}
          className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob(
              [JSON.stringify({ timezone, rules, startDate, repeat, untilMode, untilDate, tz }, null, 2)],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "availability.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
        >
          Export JSON
        </button>
      </div>

      {/* Week preview (ranges summary) */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            className="border px-3 py-1 rounded-2xl"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            ← Prev week
          </button>
          <div className="text-sm font-medium">
            {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
          <button
            className="border px-3 py-1 rounded-2xl"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            Next week →
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(7,minmax(110px,1fr))", gap: 8 }}>
          {days.map((d) => {
            const key = ymd(d);
            const ranges = weekPreview[key] || [];
            return (
              <div key={key} className="border rounded-2xl p-2">
                <div className="text-xs opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                <div className="font-semibold">
                  {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
                <div className="text-xs opacity-80">{ranges.length} {ranges.length === 1 ? "range" : "ranges"}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ranges.map((r, i) => (
                    <span key={i} className="border rounded-xl px-2 py-0.5 text-xs">
                      {r.start}–{r.end}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
