// client/src/pages/BookLesson.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

// Backend base URL
const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

// Helpers
const fmtISO = (d) => d.toISOString();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const DURATIONS = [30, 45, 60, 90];
const NOTES_MAX = 300;

// Mini calendar day button
function DayPill({ date, hasSlots, selected, onSelect }) {
  const label = date.toLocaleDateString(undefined, { weekday: "short" });
  const num = date.getDate();
  return (
    <button
      onClick={() => onSelect(date)}
      aria-pressed={selected}
      title={date.toDateString()}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        marginRight: 8,
        marginBottom: 8,
        cursor: "pointer",
        background: selected ? "#111827" : hasSlots ? "#10b98122" : "#9ca3af22",
        color: selected ? "#fff" : "#111827",
        minWidth: 64,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{num}</div>
      <div style={{ fontSize: 11, opacity: 0.8 }}>{hasSlots ? "Available" : "No slots"}</div>
    </button>
  );
}

// Weekly preview grid (card-style weekly view with counts)
function WeeklyGrid({ days, selectedDay, onSelect, countSlotsFor }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(90px, 1fr))",
        gap: 8,
        marginTop: 8,
      }}
    >
      {days.map((d) => {
        const selected = d.toDateString() === selectedDay.toDateString();
        const count = countSlotsFor(d);
        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelect(d)}
            aria-pressed={selected}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: selected ? "#111827" : count > 0 ? "#10b98122" : "#9ca3af22",
              color: selected ? "#fff" : "#111827",
              textAlign: "left",
            }}
            title={d.toDateString()}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div style={{ fontWeight: 700 }}>
              {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {count} {count === 1 ? "slot" : "slots"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function BookLesson() {
  const { tutorId } = useParams();
  const loc = useLocation();
  const passedTutor = loc.state?.tutor || null;

  const [tutor, setTutor] = useState(passedTutor);

  // Load tutor if not passed in state
  useEffect(() => {
    if (tutor || !tutorId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch(`/api/tutors/${encodeURIComponent(tutorId)}`);
        if (!cancelled) setTutor(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setTutor(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tutorId, tutor]);

  const backTo = loc.state?.from
    ? `${loc.state.from.pathname}${loc.state.from.search || ""}`
    : "/tutors";

  const tutorObj = passedTutor || {};
  const tutorName = tutorObj?.name || tutor?.name || "Tutor";

  // NEW: State for Lesson Type and Package Quantity
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [packageMode, setPackageMode] = useState("single"); // "single" or "package"

  const prefsKey = tutorId ? `bookPrefs:${tutorId}` : null;
  const [duration, setDuration] = useState(60);
  const [trial, setTrial] = useState(false);
  const [notes, setNotes] = useState("");

  // Restore prefs
  useEffect(() => {
    if (!prefsKey) return;
    try {
      const raw = localStorage.getItem(prefsKey);
      if (!raw) return;
      const { duration: d, trial: t, notes: n } = JSON.parse(raw);
      if (typeof d === "number" && DURATIONS.includes(d)) setDuration(d);
      if (typeof t === "boolean") setTrial(t);
      if (typeof n === "string") setNotes(n.slice(0, NOTES_MAX));
    } catch {
      // ignore
    }
  }, [prefsKey]);

  // Persist prefs
  useEffect(() => {
    if (!prefsKey) return;
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ duration, trial, notes }));
    } catch {
      // ignore
    }
  }, [prefsKey, duration, trial, notes]);

  const [tutorTz, setTutorTz] = useState(null);
  const [tz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  const todayStart = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(todayStart);
  const weekEnd = addDays(weekStart, 6);

  const [selectedDay, setSelectedDay] = useState(todayStart);
  useEffect(() => {
    if (selectedDay < weekStart || selectedDay > addDays(weekStart, 6)) {
      setSelectedDay(weekStart);
    }
  }, [weekStart, selectedDay]);

  // NEW: Logic to find Bob's Pricing Templates
  const templates = tutor?.lessonTemplates || [];
  const currentTemplate = templates[selectedTypeIndex] || null;

  const hourlyPrice = tutorObj?.price ?? tutor?.price ?? null;

  const priceForDuration = useMemo(() => {
    if (trial) return 0;
    
    // If Bob has customized Lesson Types, use those prices
    if (currentTemplate) {
      if (packageMode === "package") {
        // LOCK IN: (Total Price - Dollar Discount) / 5
        const total = (currentTemplate.priceSingle * 5) - currentTemplate.packageFiveDiscount;
        return total / 5;
      }
      return currentTemplate.priceSingle;
    }

    // Original Fallback
    if (hourlyPrice == null) return null;
    return Math.round(hourlyPrice * (duration / 60) * 100) / 100;
  }, [trial, duration, hourlyPrice, currentTemplate, packageMode]);

  const loggedIn = !!localStorage.getItem("token");

  const [trialInfo, setTrialInfo] = useState({
    totalUsed: 0,
    usedWithTutor: 0,
    limitTotal: 3,
    limitPerTutor: 1,
  });
  const trialTotalLeft = Math.max(0, trialInfo.limitTotal - trialInfo.totalUsed);
  const trialWithTutorLeft = Math.max(0, trialInfo.limitPerTutor - trialInfo.usedWithTutor);
  const trialAllowed = trialTotalLeft > 0 && trialWithTutorLeft > 0;

  // If limits reached, auto-disable trial toggle
  useEffect(() => {
    if (!trialAllowed && trial) setTrial(false);
  }, [trialAllowed, trial]);

  // Load tutor timezone (live mode only)
  useEffect(() => {
    if (MOCK || !tutorId) return;

    let cancelled = false;

    (async () => {
      try {
        const d = await apiFetch(`/api/availability/${encodeURIComponent(tutorId)}`);
        if (!cancelled) setTutorTz(d?.timezone || null);
      } catch (e) {
        console.warn("Tutor timezone load failed (ok if not implemented yet):", e);
        if (!cancelled) setTutorTz(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tutorId]);

  // ---------- Load trial summary (mock + live) ----------
  useEffect(() => {
    if (!tutorId) return;

    const load = async () => {
      try {
        if (MOCK) {
          const totalUsed = Number(localStorage.getItem("mockTrialsTotal") || 0);
          const byTutorKey = `mockTrialsByTutor:${tutorId}`;
          const usedWithTutor = Number(localStorage.getItem(byTutorKey) || 0);
          setTrialInfo({
            totalUsed,
            usedWithTutor,
            limitTotal: 3,
            limitPerTutor: 1,
          });
        } else {
          const d = await apiFetch(
            `/api/lessons/trial-summary/${encodeURIComponent(tutorId)}`,
            { auth: true }
          );

          const totalUsed = Number(d?.totalTrials ?? d?.totalUsed ?? 0);
          const usedWithTutor = d?.usedWithTutor ? 1 : 0;

          setTrialInfo({
            totalUsed,
            usedWithTutor,
            limitTotal: 3,
            limitPerTutor: 1,
          });
        }
      } catch (e) {
        console.warn("Trial summary load failed (using defaults):", e);
      }
    };

    load();
  }, [tutorId]);

  const [weekSlots, setWeekSlots] = useState({});
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [error, setError] = useState("");

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const daySlots = useMemo(() => {
    const key = startOfDay(selectedDay).toISOString().slice(0, 10);
    const arr = weekSlots[key] || [];
    return arr
      .map((iso) => new Date(iso))
      .sort((a, b) => a - b)
      .map((d) => ({
        iso: d.toISOString(),
        label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
  }, [selectedDay, weekSlots]);

  const weekTotal = useMemo(
    () => Object.values(weekSlots).reduce((n, arr) => n + (arr?.length || 0), 0),
    [weekSlots]
  );

  const mockCfg = useMemo(() => {
    if (!MOCK) return null;
    const rules = JSON.parse(localStorage.getItem("availabilityRules") || "null");
    const startDate =
      localStorage.getItem("availabilityStartDate") ||
      new Date().toISOString().slice(0, 10);
    const repeat = localStorage.getItem("availabilityRepeat") || "weekly";
    const untilMode = localStorage.getItem("availabilityUntilMode") || "always";
    const untilDate = localStorage.getItem("availabilityUntilDate") || "";
    return { rules, startDate, repeat, untilMode, untilDate };
  }, []);

  const prevDisabled = useMemo(() => weekStart <= todayStart, [weekStart, todayStart]);

  const nextDisabled = useMemo(() => {
    if (!MOCK) return false;
    if (mockCfg?.untilMode === "until" && mockCfg?.untilDate) {
      const until = new Date(`${mockCfg.untilDate}T00:00:00`);
      const next = addDays(weekStart, 7);
      return addDays(next, 6) > until;
    }
    return false;
  }, [MOCK, mockCfg, weekStart]);

  // Load availability slots for the visible week
  useEffect(() => {
    if (!tutorId) return;

    const fetchWeek = async () => {
      setLoadingWeek(true);
      setError("");
      try {
        const from = startOfDay(days[0]);
        const to = addDays(from, 7);
        const dur = trial ? 30 : duration;
        const qs = new URLSearchParams({
          from: fmtISO(from),
          to: fmtISO(to),
          dur: String(dur),
          tz,
        });

        const cacheKey = [
          "weekSlots",
          tutorId,
          from.toISOString().slice(0, 10),
          dur,
          tz,
        ].join("|");

        try {
          const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
          if (cached && typeof cached === "object") {
            setWeekSlots(cached);
            setLoadingWeek(false);
            return;
          }
        } catch {
          // ignore cache errors
        }

        const data = await apiFetch(
          `/api/availability/${encodeURIComponent(tutorId)}/slots?${qs.toString()}`
        );

        const list = Array.isArray(data?.slots)
          ? data.slots
          : Array.isArray(data)
          ? data
          : [];

        const grouped = {};
        for (const iso of list) {
          const key = startOfDay(new Date(iso)).toISOString().slice(0, 10);
          grouped[key] = grouped[key] || [];
          grouped[key].push(iso);
        }

        for (const d of days) {
          const key = d.toISOString().slice(0, 10);
          grouped[key] = grouped[key] || [];
        }

        setWeekSlots(grouped);

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(grouped));
        } catch {
          // ignore cache write errors
        }
      } catch (e) {
        setError(e.message || "Failed to load availability");
      } finally {
        setLoadingWeek(false);
      }
    };

    fetchWeek();
  }, [tutorId, duration, trial, tz, weekStart, mockCfg, days]);

  const hasSlotsFor = (date) => {
    const key = date.toISOString().slice(0, 10);
    return (weekSlots[key] || []).length > 0;
  };

  const countSlotsFor = (date) => {
    const key = date.toISOString().slice(0, 10);
    return (weekSlots[key] || []).length;
  };

  // ---------------------------------------------------
  // LIVE BOOKING: save real lesson to backend/Mongo
  // ---------------------------------------------------
  async function handleBook(iso) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        const params = new URLSearchParams({
          next: `/book/${encodeURIComponent(tutorId)}`,
        });
        window.location.href = `/login?${params.toString()}`;
        return;
      }

      if (notes.length > NOTES_MAX) {
        alert(`Notes too long (max ${NOTES_MAX}).`);
        return;
      }

      const dur = trial ? 30 : duration;
      const startDate = new Date(iso);
      const endDate = new Date(startDate.getTime() + dur * 60000);

      const body = {
        tutor: tutorId,
        subject: currentTemplate?.title || "",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        price: !trial && priceForDuration != null ? priceForDuration : 0,
        currency: "EUR",
        notes: notes.trim(),
        isTrial: !!trial,
        // NEW italki metadata
        lessonTypeTitle: currentTemplate?.title || "General Lesson",
        isPackage: packageMode === "package",
        packageSize: packageMode === "package" ? 5 : 1
      };

      const data = await apiFetch(`${API}/api/lessons`, {
        method: "POST",
        body,
        auth: true,
      });

      const lessonId = data._id;

      if (trial) {
        window.location.href = `/tutors/${encodeURIComponent(tutorId)}?trial=1`;
        return;
      }

      window.location.href = `/pay/${encodeURIComponent(lessonId)}`;
    } catch (e) {
      alert(e.message || "Booking failed");
    }
  }

  if (!tutorId) {
    return (
      <div style={{ padding: 16 }}>
        Missing tutorId. Open this page from a tutor profile.
      </div>
    );
  }

  const weekLabel =
    weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " – " +
    weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: 'Inter, sans-serif' }}>
      {/* Back to tutors */}
      <div style={{ marginBottom: 8 }}>
        <Link to={backTo} className="text-sm underline">
          ← Back to tutors
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
        Book a lesson with {tutorName}
      </h1>

      {/* italki Step 1: Lesson Type Selection */}
      {templates.length > 0 && (
        <section style={{ marginBottom: 24, padding: 20, background: "#f8fafc", borderRadius: 20, border: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#475569", textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Select Lesson Category</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {templates.map((t, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedTypeIndex(idx); setTrial(false); }}
                style={{
                  padding: 16, textAlign: "left", borderRadius: 16, border: "2px solid", 
                  borderColor: selectedTypeIndex === idx ? "#4f46e5" : "#fff",
                  background: selectedTypeIndex === idx ? "#eef2ff" : "#fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)", cursor: "pointer", transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{t.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, height: 36, overflow: "hidden", lineHeight: '1.4' }}>{t.description}</div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "#4f46e5", fontSize: 16 }}>${t.priceSingle}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* italki Step 2: Package Toggle */}
      {!trial && currentTemplate && (
        <section style={{ marginBottom: 24, padding: 20, background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#475569", textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Choose Quantity</h2>
          <div style={{ display: "flex", gap: 16 }}>
            <button 
              onClick={() => setPackageMode("single")}
              style={{ flex: 1, padding: 16, borderRadius: 16, border: "2px solid", borderColor: packageMode === "single" ? "#4f46e5" : "#f1f5f9", background: packageMode === "single" ? "#eef2ff" : "#fff", cursor: "pointer" }}
            >
              <div style={{ fontWeight: 800, fontSize: 15 }}>Single Lesson</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>${currentTemplate.priceSingle} total</div>
            </button>
            <button 
              onClick={() => setPackageMode("package")}
              style={{ flex: 1, padding: 16, borderRadius: 16, border: "2px solid", borderColor: packageMode === "package" ? "#4f46e5" : "#f1f5f9", background: packageMode === "package" ? "#eef2ff" : "#fff", cursor: "pointer", position: "relative" }}
            >
              {currentTemplate.packageFiveDiscount > 0 && (
                <span style={{ position: "absolute", top: -10, right: 10, background: "#10b981", color: "#fff", fontSize: 10, padding: "4px 10px", borderRadius: 20, fontWeight: 900, boxShadow: '0 2px 4px rgba(16,185,129,0.3)' }}>
                  SAVE ${currentTemplate.packageFiveDiscount}
                </span>
              )}
              <div style={{ fontWeight: 800, fontSize: 15 }}>5-Lesson Package</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>${(((currentTemplate.priceSingle * 5) - currentTemplate.packageFiveDiscount) / 5).toFixed(2)} / lesson</div>
            </button>
          </div>
        </section>
      )}

      <div
        style={{
          padding: "10px 14px",
          fontSize: 13,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#eff6ff",
          marginBottom: 16,
          fontWeight: 500,
          color: '#1d4ed8'
        }}
      >
        Times are shown in your local timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        {!currentTemplate && (
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Duration:&nbsp;
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={trial}
              style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </label>
        )}

        {trialAllowed ? (
          <label style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={trial}
              onChange={(e) => { 
                setTrial(e.target.checked); 
                if(e.target.checked) setPackageMode("single"); 
              }}
            />{" "}
            Trial lesson (30 min, free)
          </label>
        ) : (
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
            Trial limit reached.
          </div>
        )}

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Used: {trialInfo.totalUsed}/{trialInfo.limitTotal} {"  •  "}
          This tutor: {trialInfo.usedWithTutor}/{trialInfo.limitPerTutor}
        </div>

        {hourlyPrice != null && (
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
            Price:{" "}
            {trial
              ? "€ 0.00 (trial)"
              : `€ ${priceForDuration?.toFixed(2)} ${packageMode === 'package' ? 'per lesson (locked)' : ''}`}
          </div>
        )}

        <button
          onClick={() => {
            setDuration(60);
            setTrial(false);
            setNotes("");
            setPackageMode("single");
            if (prefsKey) localStorage.removeItem(prefsKey);
          }}
          style={{
            padding: "6px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700
          }}
        >
          Reset
        </button>
      </div>

      {/* Week navigation */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: 'blur(8px)',
          zIndex: 10,
          borderBottom: "1px solid #e5e7eb",
          padding: '12px 0',
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => !prevDisabled && setWeekStart(addDays(weekStart, -7))}
            disabled={prevDisabled}
            style={{
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: prevDisabled ? "#f3f4f6" : "#fff",
              cursor: prevDisabled ? "not-allowed" : "pointer",
              fontWeight: 700
            }}
          >
            ← Prev
          </button>
          <div style={{ fontWeight: 800, flex: 1, textAlign: "center", fontSize: 16 }}>
            {weekLabel}
          </div>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            style={{
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15 }}>3. Pick a date & time</div>
      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 12 }}>
        {days.map((d) => (
          <DayPill
            key={d.toISOString()}
            date={d}
            hasSlots={hasSlotsFor(d)}
            selected={sameDay(d, selectedDay)}
            onSelect={setSelectedDay}
          />
        ))}
      </div>

      <WeeklyGrid
        days={days}
        selectedDay={selectedDay}
        onSelect={setSelectedDay}
        countSlotsFor={countSlotsFor}
      />

      {/* Notes */}
      <div style={{ marginTop: 24, marginBottom: 20 }}>
        <label style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>Notes for {tutorName} (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
          rows={3}
          placeholder="What would you like to focus on?"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 700,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            marginTop: 8,
            fontSize: 14
          }}
        />
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
          {notes.length}/{NOTES_MAX} characters
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12, fontWeight: 600 }}>{error}</div>}
      {loadingWeek && <div style={{ marginBottom: 12, color: '#6366f1', fontWeight: 600 }}>Syncing availability…</div>}

      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
        {selectedDay.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </h2>

      {daySlots.length === 0 ? (
        <div style={{ padding: 20, background: "#fffbeb", borderRadius: 16, border: '1px solid #fef3c7', color: '#92400e' }}>
          <div style={{ fontWeight: 700 }}>No slots for this date.</div>
          {!trial ? (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Try another duration:&nbsp;
              {DURATIONS.filter((d) => d !== duration).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    marginRight: 6,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid #fcd34d",
                    background: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
              Trials are fixed at 30 minutes.
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {daySlots.map((s) => (
            <button
              key={s.iso}
              onClick={() => handleBook(s.iso)}
              style={{
                padding: "18px",
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                background: "#ffffff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                minHeight: 64,
                fontSize: 16,
                fontWeight: 800,
                transition: 'all 0.2s'
              }}
              title={new Date(s.iso).toString()}
            >
              {s.label}
              <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 500, marginTop: 2 }}>
                {tutorTz ? `Tutor: ${new Date(s.iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tutorTz })}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Next available day logic preserved */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => {
            const idx = days.findIndex((d) => d.toDateString() === selectedDay.toDateString());
            const next = days.slice(idx + 1).find((d) => countSlotsFor(d) > 0);
            if (next) setSelectedDay(next);
          }}
          style={{
            padding: "10px 16px",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13
          }}
        >
          Skip to next available day →
        </button>
      </div>
    </div>
  );
}
