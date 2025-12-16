// client/src/pages/BookLesson.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";

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
  useEffect(() => {
    if (tutor) return;
    if (!tutorId) return;
    fetch(`${API}/api/tutors/${encodeURIComponent(tutorId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load tutor"))))
      .then(setTutor)
      .catch(() => setTutor(null));
  }, [tutorId]);

  const backTo = loc.state?.from
    ? `${loc.state.from.pathname}${loc.state.from.search || ""}`
    : "/tutors";

  const tutorObj = passedTutor || {};
  const tutorName = tutorObj?.name || tutor?.name || "Tutor";

  const prefsKey = tutorId ? `bookPrefs:${tutorId}` : null;
  const [duration, setDuration] = useState(60);
  const [trial, setTrial] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!prefsKey) return;
    try {
      const raw = localStorage.getItem(prefsKey);
      if (!raw) return;
      const { duration: d, trial: t, notes: n } = JSON.parse(raw);
      if (typeof d === "number" && DURATIONS.includes(d)) setDuration(d);
      if (typeof t === "boolean") setTrial(t);
      if (typeof n === "string") setNotes(n.slice(0, NOTES_MAX));
    } catch {}
  }, [prefsKey]);

  useEffect(() => {
    if (!prefsKey) return;
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ duration, trial, notes }));
    } catch {}
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

  const hourlyPrice = tutorObj?.price ?? tutor?.price ?? null;
  const priceForDuration = useMemo(() => {
    if (trial) return 0;
    if (hourlyPrice == null) return null;
    return Math.round(hourlyPrice * (duration / 60) * 100) / 100;
  }, [trial, duration, hourlyPrice]);

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

  useEffect(() => {
    if (!trialAllowed && trial) setTrial(false);
  }, [trialAllowed]);

  useEffect(() => {
    if (!MOCK && tutorId) {
      fetch(`${API}/api/availability/${encodeURIComponent(tutorId)}`)
        .then((r) => r.json())
        .then((d) => setTutorTz(d?.timezone || null))
        .catch(() => setTutorTz(null));
    }
  }, [tutorId]);

  // ---------- REPLACED BLOCK: load trial summary ----------
  useEffect(() => {
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
          const token = localStorage.getItem("token");
          const r = await fetch(
            `${API}/api/lessons/trial-summary/${encodeURIComponent(tutorId)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          if (!r.ok) throw new Error(`Trial summary failed (${r.status})`);
          const d = await r.json();

          const totalUsed = Number(d?.totalTrials ?? d?.totalUsed ?? 0);
          const usedWithTutor = d?.usedWithTutor ? 1 : 0;

          setTrialInfo({
            totalUsed,
            usedWithTutor,
            limitTotal: 3,
            limitPerTutor: 1,
          });
        }
      } catch {
        // keep defaults (3 total, 1 per tutor, 0 used)
      }
    };

    if (tutorId) load();
  }, [tutorId]);
  // ---------- END REPLACED BLOCK ----------

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
      localStorage.getItem("availabilityStartDate") || new Date().toISOString().slice(0, 10);
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

        const cacheKey = ["weekSlots", tutorId, from.toISOString().slice(0, 10), dur, tz].join(
          "|"
        );
        try {
          const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
          if (cached && typeof cached === "object") {
            setWeekSlots(cached);
            setLoadingWeek(false);
            return;
          }
        } catch {}

        const r = await fetch(
          `${API}/api/availability/${encodeURIComponent(tutorId)}/slots?${qs}`
        );
        if (!r.ok) throw new Error(`Failed to load slots (${r.status})`);
        const data = await r.json();

        const list =
          Array.isArray(data?.slots) ? data.slots : Array.isArray(data) ? data.map((x) => x.start) : [];

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
        } catch {}
      } catch (e) {
        setError(e.message || "Failed to load availability");
      } finally {
        setLoadingWeek(false);
      }
    };
    fetchWeek();
  }, [tutorId, duration, trial, tz, weekStart, mockCfg]);

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
        subject: "",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        price: !trial && priceForDuration != null ? priceForDuration : 0,
        currency: "EUR",
        notes: notes.trim(),
        isTrial: !!trial,
      };

      const r = await fetch(`${API}/api/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "Booking failed");
      }

      const data = await r.json();
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
    return <div style={{ padding: 16 }}>Missing tutorId. Open this page from a tutor profile.</div>;
  }

  const weekLabel =
    weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " – " +
    weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      {/* Back to tutors */}
      <div style={{ marginBottom: 8 }}>
        <Link to={backTo} className="text-sm underline">
          ← Back to tutors
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        Book a lesson with {tutorName}
      </h1>

      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#eff6ff",
          marginBottom: 8,
        }}
      >
        Times are shown in your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <label>
          Duration:&nbsp;
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={trial}
          >
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
          </select>
        </label>

        <label title="Trials are 30 minutes and free. Limits: max 3 total, 1 per tutor.">
          <input
            type="checkbox"
            checked={trial && trialAllowed}
            disabled={!trialAllowed}
            onChange={(e) => setTrial(e.target.checked)}
          />{" "}
          Trial lesson (30 min, free)
        </label>

        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Trials used: {trialInfo.totalUsed}/{trialInfo.limitTotal} {"  •  "}
          This tutor: {trialInfo.usedWithTutor}/{trialInfo.limitPerTutor}
          {!trialAllowed ? "  —  Trial limits reached" : ""}
        </div>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Your time: {tz}
          {tutorTz ? `  •  Tutor time: ${tutorTz}` : ""}
        </div>

        {hourlyPrice != null && (
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Price: {trial ? "€ 0.00 (trial)" : `€ ${priceForDuration?.toFixed(2)} (${duration} min)`}
          </div>
        )}

        {!loggedIn && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            You’ll be asked to log in when you pick a time.
          </div>
        )}

        <button
          onClick={() => {
            setDuration(60);
            setTrial(false);
            setNotes("");
            if (prefsKey) localStorage.removeItem(prefsKey);
          }}
          title="Reset duration, trial, and notes for this tutor"
          style={{
            padding: "6px 10px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "#fff",
            cursor: "pointer",
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
          background: "#fff",
          zIndex: 10,
          borderBottom: "1px solid #e5e7eb",
          padding: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => !prevDisabled && setWeekStart(addDays(weekStart, -7))}
            disabled={prevDisabled}
            style={{
              padding: "8px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: prevDisabled ? "#f3f4f6" : "#fff",
              cursor: prevDisabled ? "not-allowed" : "pointer",
            }}
          >
            ← Prev week
          </button>
          <div style={{ fontWeight: 700, flex: 1, textAlign: "center" }}>{weekLabel}</div>
          <button
            onClick={() => !nextDisabled && setWeekStart(addDays(weekStart, 7))}
            disabled={nextDisabled}
            style={{
              padding: "8px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: nextDisabled ? "#f3f4f6" : "#fff",
              cursor: nextDisabled ? "not-allowed" : "pointer",
            }}
          >
            Next week →
          </button>
        </div>
      </div>

      {/* Mini 7-day calendar */}
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Pick a day</div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
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

      {/* Weekly preview bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: 8,
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          background: "#fafafa",
          marginBottom: 8,
        }}
      >
        {days.map((d) => {
          const count = countSlotsFor(d);
          const isSel = sameDay(d, selectedDay);
          const bg = isSel ? "#3b82f6" : count > 0 ? "#ecfdf5" : "#f3f4f6";
          const color = isSel ? "#fff" : "#111827";
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDay(d)}
              title={d.toDateString()}
              style={{
                padding: "6px 10px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: bg,
                color,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {d.toLocaleDateString([], { weekday: "short" })} ({count})
            </button>
          );
        })}
      </div>

      {/* Weekly preview grid */}
      <WeeklyGrid
        days={days}
        selectedDay={selectedDay}
        onSelect={setSelectedDay}
        countSlotsFor={countSlotsFor}
      />
      <div style={{ marginTop: 6, marginBottom: 16, fontSize: 12, opacity: 0.8 }}>
        Green = available, Grey = not available. Click a day to view times.
      </div>

      {/* Notes */}
      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <label>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
          rows={3}
          placeholder="Add lesson goals, topics, level, preferences…"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 700,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        />
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {notes.length}/{NOTES_MAX}
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
      {loadingWeek && <div style={{ marginBottom: 12 }}>Loading availability…</div>}

      {/* Slots grid */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {selectedDay.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </h2>

      {daySlots.length === 0 ? (
        <div style={{ padding: 12, background: "#fef9c3", borderRadius: 8 }}>
          <div>No slots for this day and duration.</div>
          {!trial ? (
            <div style={{ marginTop: 8 }}>
              Try:{" "}
              {DURATIONS.filter((d) => d !== duration).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    marginRight: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {d} min
                </button>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8, opacity: 0.8 }}>Trials are fixed at 30 minutes.</div>
          )}
          {weekTotal === 0 && (
            <div style={{ marginTop: 8, opacity: 0.8 }}>
              No slots this week for the selected duration. Try a different duration or week.
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: 8,
          }}
        >
          {daySlots.map((s) => (
            <button
              key={s.iso}
              onClick={() => handleBook(s.iso)}
              style={{
                padding: "16px",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                minHeight: 56,
                fontSize: 16,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
              title={new Date(s.iso).toString()}
            >
              {s.label}
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {tutorTz
                  ? new Date(s.iso).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: tutorTz,
                    })
                  : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Next available day */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => {
            const idx = days.findIndex(
              (d) => d.toDateString() === selectedDay.toDateString()
            );
            const next = days.slice(idx + 1).find((d) => countSlotsFor(d) > 0);
            if (next) setSelectedDay(next);
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "#fff",
            cursor: "pointer",
          }}
          title="Jump to next day with slots"
        >
          Next available day →
        </button>
      </div>
    </div>
  );
}
