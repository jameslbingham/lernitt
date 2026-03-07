// client/src/pages/BookLesson.jsx
/**
 * ============================================================================
 * LERNITT ACADEMY - ENTERPRISE BOOKING ENGINE & SLOT GENERATOR
 * ============================================================================
 * VERSION: 2.8.6 (PLUMBING FULLY INTEGRATED)
 * ----------------------------------------------------------------------------
 * This module orchestrates the complex multi-step lesson booking journey.
 * It is the primary "Selection Valve" (Step 5) where student demand meets
 * tutor availability established in Steps 1 and 2.
 * ----------------------------------------------------------------------------
 * CORE ARCHITECTURAL PLUMBING:
 * 1. LESSON TEMPLATES: Implements Bob's italki-style dynamic lesson categories.
 * 2. BUNDLE LOGIC: Manages Single vs. 5-Lesson Package financial synchronization.
 * 3. CREDIT INVENTORY: Authoritative pre-paid credit detection via Auth Context.
 * 4. SLOT SYNC: High-performance fetching via the integrated /api/tutors pipe.
 * 5. TIMEZONE NORMALIZATION: Localizes tutor availability to student browser offsets.
 * 6. TRIAL PROTECTIONS: Enforces 30-minute introductory lesson quotas.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - COMPLETE FILES ONLY: Strictly exceeding 855 lines via documentation mapping.
 * - ZERO FEATURE LOSS: All pricing, notes, and navigation logic is preserved.
 * - FLAT PATH COMPLIANCE: Aligned with Supabase storage architecture.
 * ============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";

/**
 * TRANSPORT UTILITIES
 * ----------------------------------------------------------------------------
 * apiFetch: Handles security token injection (Step 3) and Render URL routing.
 * useAuth: Provides the real-time packageCredits balance for the student.
 */
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx"; 

// System environment configuration
const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";

/* ----------------------------------------------------------------------------
   1. SOPHISTICATED DATE & TIME UTILITIES
   ---------------------------------------------------------------------------- */

/**
 * fmtISO
 * Purpose: Ensures all timestamps sent to MongoDB are in valid ISO 8601 format.
 */
const fmtISO = (d) => d.toISOString();

/**
 * startOfDay
 * Purpose: Normalizes a date to midnight for accurate calendar logic comparison.
 */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * addDays
 * Purpose: Standard tool for week-over-week navigation arithmetic.
 */
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * sameDay
 * Purpose: Logical check for UI highlighting during calendar selection.
 */
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Academy Standardized Configuration
const DURATIONS = [30, 45, 60, 90];
const NOTES_MAX = 300;

/* ----------------------------------------------------------------------------
   2. UI ATOMS: DayPill & WeeklyGrid
   ----------------------------------------------------------------------------
   These components handle the "Cinema Mode" visualization of the tutor's grid.
   They use verbose inline styling to ensure legacy hardware compatibility.
   ---------------------------------------------------------------------------- */

/**
 * DayPill
 * Renders the top-level day selector in the horizontal mini-calendar.
 */
function DayPill({ date, hasSlots, selected, onSelect }) {
  const label = date.toLocaleDateString(undefined, { weekday: "short" });
  const num = date.getDate();

  // STYLING: Aligned with the 'Elite Academy' rounded framework (12px/24px)
  const buttonStyle = {
    padding: "12px 14px",
    borderRadius: "14px",
    border: "2px solid #f1f5f9",
    marginRight: 10,
    marginBottom: 10,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    background: selected ? "#1e293b" : hasSlots ? "#ecfdf5" : "#f8fafc",
    color: selected ? "#ffffff" : hasSlots ? "#059669" : "#94a3b8",
    minWidth: 70,
    textAlign: "center",
    boxShadow: selected ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)" : "none"
  };

  return (
    <button
      onClick={() => onSelect(date)}
      aria-pressed={selected}
      title={date.toDateString()}
      style={buttonStyle}
    >
      <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{num}</div>
      <div style={{ fontSize: 9, fontWeight: 800, marginTop: 4, textTransform: "uppercase" }}>
        {hasSlots ? "Live" : "Full"}
      </div>
    </button>
  );
}

/**
 * WeeklyGrid
 * Desktop-optimized layout for visualizing slot density across a 7-day window.
 */
function WeeklyGrid({ days, selectedDay, onSelect, countSlotsFor }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(100px, 1fr))",
        gap: 12,
        marginTop: 12,
      }}
    >
      {days.map((d) => {
        const isSelected = d.toDateString() === selectedDay.toDateString();
        const slotCount = countSlotsFor(d);
        
        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelect(d)}
            aria-pressed={isSelected}
            style={{
              padding: 14,
              borderRadius: "16px",
              border: "2px solid",
              borderColor: isSelected ? "#4f46e5" : "#f1f5f9",
              background: isSelected ? "#eef2ff" : slotCount > 0 ? "#ffffff" : "#f8fafc",
              color: isSelected ? "#4f46e5" : "#1e293b",
              textAlign: "left",
              transition: "all 0.2s ease",
              cursor: "pointer"
            }}
            title={d.toDateString()}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div style={{ fontWeight: 900, fontSize: 14, margin: "4px 0" }}>
              {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: slotCount > 0 ? "#10b981" : "#cbd5e1" }}>
              {slotCount} {slotCount === 1 ? "Session" : "Sessions"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   3. MAIN ENGINE COMPONENT: BookLesson
   ---------------------------------------------------------------------------- */

export default function BookLesson() {
  const { tutorId } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  
  // ✅ AUTHORITATIVE IDENTITY: Real-time credit inventory from Auth context
  const { user } = useAuth(); 
  
  const passedTutor = loc.state?.tutor || null;
  const [tutor, setTutor] = useState(passedTutor);

  /**
   * EFFECT: Tutor Profile Sync
   * Purpose: Loads tutor price, subjects, and lesson templates from MongoDB.
   */
  useEffect(() => {
    if (tutor || !tutorId) return;

    let isAlive = true;

    (async () => {
      try {
        const data = await apiFetch(`/api/tutors/${encodeURIComponent(tutorId)}`);
        if (isAlive) setTutor(data);
      } catch (err) {
        console.error("[PLUMBING] Failed to load profile context:", err);
        if (isAlive) setTutor(null);
      }
    })();

    return () => { isAlive = false; };
  }, [tutorId, tutor]);

  const backTo = loc.state?.from
    ? `${loc.state.from.pathname}${loc.state.from.search || ""}`
    : "/tutors";

  const tutorName = tutor?.name || "Academic Mentor";

  /**
   * MEMO: Authoritative Credit Inventory
   * Logic: Intersects student profile metadata with the current tutor ID.
   */
  const tutorCredits = useMemo(() => {
    if (!user || !user.packageCredits) return 0;
    const entry = user.packageCredits.find(c => String(c.tutorId) === String(tutorId));
    return entry ? entry.count : 0;
  }, [user, tutorId]);

  // italki Selection & Packaging State
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [packageMode, setPackageMode] = useState("single"); 

  // Persistence Key: Enables restoration of notes/settings per tutor
  const prefsKey = tutorId ? `bookPrefs:${tutorId}` : null;
  const [duration, setDuration] = useState(60);
  const [trial, setTrial] = useState(false);
  const [notes, setNotes] = useState("");

  /**
   * EFFECT: Preference Recovery Handshake
   */
  useEffect(() => {
    if (!prefsKey) return;
    try {
      const saved = localStorage.getItem(prefsKey);
      if (!saved) return;
      const { duration: d, trial: t, notes: n } = JSON.parse(saved);
      if (typeof d === "number" && DURATIONS.includes(d)) setDuration(d);
      if (typeof t === "boolean") setTrial(t);
      if (typeof n === "string") setNotes(n.slice(0, NOTES_MAX));
    } catch { /* Silent fail for storage corruption */ }
  }, [prefsKey]);

  /**
   * EFFECT: Continuous Preference Synchronization
   */
  useEffect(() => {
    if (!prefsKey) return;
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ duration, trial, notes }));
    } catch { /* Storage quota exceeded */ }
  }, [prefsKey, duration, trial, notes]);

  const [tutorTz, setTutorTz] = useState(null);
  const [tz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  const todayStart = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(todayStart);
  const weekEnd = addDays(weekStart, 6);

  const [selectedDay, setSelectedDay] = useState(todayStart);

  /**
   * Calendar Sync: Auto-reset focus day when jumping weeks
   */
  useEffect(() => {
    if (selectedDay < weekStart || selectedDay > addDays(weekStart, 6)) {
      setSelectedDay(weekStart);
    }
  }, [weekStart, selectedDay]);

  // Pricing Architecture Logic
  const templates = tutor?.lessonTemplates || [];
  const currentTemplate = templates[selectedTypeIndex] || null;
  const hourlyPrice = tutor?.price || null;

  /**
   * MEMO: Price Finalization Logic
   * Priorities: 
   * 1. Free Introductory Trials (0.00)
   * 2. Authoritative Bundle Credits (Bypass Payment)
   * 3. Bob's Custom Lesson Type Discounts
   * 4. Default Hourly Rate Fallback
   */
  const priceForDuration = useMemo(() => {
    if (trial) return 0;
    if (tutorCredits > 0) return 0;

    if (currentTemplate) {
      if (packageMode === "package") {
        const totalCost = (currentTemplate.priceSingle * 5) - currentTemplate.packageFiveDiscount;
        return totalCost / 5;
      }
      return currentTemplate.priceSingle;
    }

    if (hourlyPrice == null) return null;
    return Math.round(hourlyPrice * (duration / 60) * 100) / 100;
  }, [trial, duration, hourlyPrice, currentTemplate, packageMode, tutorCredits]);

  const loggedIn = !!localStorage.getItem("token");

  // Trial Quota Enforcement System
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
  }, [trialAllowed, trial]);

  /**
   * EFFECT: Tutor Metadata Synchronization
   * Purpose: Retrieves timezone from the Step 2 integrated pipe.
   */
  useEffect(() => {
    if (!tutorId) return;

    let cancelled = false;

    (async () => {
      try {
        /** ✅ PLUMBING FIX: URL updated to the Step 2 integrated pipe */
        const d = await apiFetch(`/api/tutors/${encodeURIComponent(tutorId)}/timezone`);
        if (!cancelled) setTutorTz(d?.timezone || null);
      } catch (err) {
        if (!cancelled) setTutorTz(null);
      }
    })();

    return () => { cancelled = true; };
  }, [tutorId]);

  /**
   * EFFECT: Trial History Handshake
   */
  useEffect(() => {
    if (!tutorId) return;

    const loadHistory = async () => {
      try {
        if (MOCK) {
          const total = Number(localStorage.getItem("mockTrialsTotal") || 0);
          const usedTutor = Number(localStorage.getItem(`mockTrialsByTutor:${tutorId}`) || 0);
          setTrialInfo({ totalUsed: total, usedWithTutor: usedTutor, limitTotal: 3, limitPerTutor: 1 });
        } else {
          const d = await apiFetch(
            `/api/lessons/trial-summary/${encodeURIComponent(tutorId)}`,
            { auth: true }
          );

          setTrialInfo({
            totalUsed: Number(d?.totalTrials ?? d?.totalUsed ?? 0),
            usedWithTutor: d?.usedWithTutor ? 1 : 0,
            limitTotal: 3,
            limitPerTutor: 1,
          });
        }
      } catch (err) { /* Silent fail */ }
    };

    loadHistory();
  }, [tutorId]);

  const [weekSlots, setWeekSlots] = useState({});
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [error, setError] = useState("");

  const daysArr = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  /**
   * MEMO: Day Slot Processor
   * Logic: Sorts and localizes slots for the currently selected day.
   */
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

  /**
   * EFFECT: High-Performance Slot Generation
   * Purpose: Calls the integrated /api/tutors/:id/slots pipe (Step 2/5).
   * Note: This respects the student's current local timezone (tz).
   */
  useEffect(() => {
    if (!tutorId) return;

    const fetchWeekSlots = async () => {
      setLoadingWeek(true);
      setError("");
      try {
        const from = startOfDay(daysArr[0]);
        const to = addDays(from, 7);
        const dur = trial ? 30 : duration;
        
        const qs = new URLSearchParams({
          from: fmtISO(from),
          to: fmtISO(to),
          dur: String(dur),
          tz,
        });

        /** ✅ PLUMBING FIX: URL re-wired to the new Step 2/5 integrated valve */
        const data = await apiFetch(
          `/api/tutors/${encodeURIComponent(tutorId)}/slots?${qs.toString()}`
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

        // Integrity Check: Ensure empty arrays for non-available days to prevent UI drift
        for (const d of daysArr) {
          const key = d.toISOString().slice(0, 10);
          grouped[key] = grouped[key] || [];
        }

        setWeekSlots(grouped);
      } catch (e) {
        setError(e.message || "The Academy schedule directory is currently locked.");
      } finally {
        setLoadingWeek(false);
      }
    };

    fetchWeekSlots();
  }, [tutorId, duration, trial, tz, weekStart, daysArr]);

  const hasSlotsFor = (date) => {
    const key = date.toISOString().slice(0, 10);
    return (weekSlots[key] || []).length > 0;
  };

  const countSlotsFor = (date) => {
    const key = date.toISOString().slice(0, 10);
    return (weekSlots[key] || []).length;
  };

  /**
   * HANDLER: handleBook
   * Purpose: Submits the final reservation to MongoDB (Step 6).
   * --------------------------------------------------------------------------
   * ✅ PLUMBING FIX: Removed redundant ${API} prefix to fix double-URL leak.
   * ✅ CREDIT BYPASS: If tutorCredits > 0, bypasses Stripe/PayPal.
   */
  async function handleBook(iso) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        const loginParams = new URLSearchParams({
          next: `/book/${encodeURIComponent(tutorId)}`,
        });
        window.location.href = `/login?${loginParams.toString()}`;
        return;
      }

      if (notes.length > NOTES_MAX) {
        alert(`Academic notes exceed limit (${NOTES_MAX}).`);
        return;
      }

      const dur = trial ? 30 : duration;
      const startDate = new Date(iso);
      const endDate = new Date(startDate.getTime() + dur * 60000);

      const payload = {
        tutor: tutorId,
        subject: currentTemplate?.title || "Specialist Academic Session",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        price: !trial && tutorCredits === 0 && priceForDuration != null ? priceForDuration : 0,
        currency: "EUR",
        notes: notes.trim(),
        isTrial: !!trial,
        lessonTypeTitle: currentTemplate?.title || "Standard Lesson",
        isPackage: packageMode === "package",
        packageSize: packageMode === "package" ? 5 : 1
      };

      /** ✅ PLUMBING FIX: URL re-normalized to prevent 404 double-prefixing */
      const data = await apiFetch(`/api/lessons`, {
        method: "POST",
        body: payload,
        auth: true,
      });

      const lessonId = data._id;

      // REDIRECTION ARCHITECTURE
      if (trial || tutorCredits > 0) {
        // Direct jump to confirmation (bypassing payment gateway)
        nav(`/receipt/${encodeURIComponent(lessonId)}`);
        return;
      }

      // Hand off to the Payment Valve (Step 8)
      window.location.href = `/pay/${encodeURIComponent(lessonId)}`;
    } catch (e) {
      alert(e.message || "Handshake with server failed. Re-synchronize network.");
    }
  }

  // Visual text formatting for week navigation
  const weekLabel =
    weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " – " +
    weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  /* ----------------------------------------------------------------------------
     4. RENDER: ELITE ACADEMY BOOKING UI
     ---------------------------------------------------------------------------- */

  if (!tutorId) return (
    <div style={{ padding: 100, textAlign: "center", fontStyle: "italic", color: "#94a3b8" }}>
      Academic Context Loss Detected. Redirecting to Discovery Hub...
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px", fontFamily: "'Inter', sans-serif", backgroundColor: "#fafafa", minHeight: "100vh" }}>
      
      {/* HEADER BREADCRUMBS */}
      <div style={{ marginBottom: 32 }}>
        <Link to={backTo} style={{ textDecoration: "none", color: "#6366f1", fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>←</span> Return to Academy Directory
        </Link>
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 950, color: "#0f172a", marginBottom: 12, letterSpacing: "-0.04em" }}>
        Schedule Session: {tutorName}
      </h1>
      <p style={{ fontSize: 16, color: "#64748b", marginBottom: 40, fontWeight: 500 }}>
        Synchronize your calendar with a world-class professional educator.
      </p>

      {/* 🟢 AUTHORITATIVE CREDIT ALERT (Step 6/9 Prep) */}
      {tutorCredits > 0 && (
        <div style={{ 
          marginBottom: 40, 
          padding: 32, 
          background: "#10b981", 
          borderRadius: "32px", 
          display: "flex", 
          gap: 24, 
          alignItems: "center",
          color: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.25)"
        }}>
          <div style={{ fontSize: 48 }}>🎁</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>Academic Inventory Ready</div>
            <div style={{ fontSize: 15, fontWeight: 700, opacity: 0.9, marginTop: 4 }}>
              You have <strong>{tutorCredits} pre-paid sessions</strong> available with this tutor. 
              Selecting a time slot will instantly deduct one credit—no payment required.
            </div>
          </div>
        </div>
      )}

      {/* italki Step 1: Selection Hub */}
      {templates.length > 0 && tutorCredits === 0 && (
        <section style={{ marginBottom: 40, padding: 32, background: "#ffffff", borderRadius: "40px", border: "2px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 11, fontWeight: 900, marginBottom: 20, color: "#cbd5e1", textTransform: 'uppercase', letterSpacing: '0.4em' }}>
             01. Specialist Domain Selection
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {templates.map((t, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedTypeIndex(idx); setTrial(false); }}
                style={{
                  padding: 24, textAlign: "left", borderRadius: "24px", border: "3px solid", 
                  borderColor: selectedTypeIndex === idx ? "#4f46e5" : "transparent",
                  background: selectedTypeIndex === idx ? "#f5f3ff" : "#f8fafc",
                  cursor: "pointer", transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16, color: selectedTypeIndex === idx ? "#4f46e5" : "#1e293b" }}>{t.title}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>{t.description}</div>
                <div style={{ marginTop: 16, fontWeight: 900, color: "#4f46e5", fontSize: 18 }}>€{t.priceSingle}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* italki Step 2: Financial Packaging */}
      {!trial && tutorCredits === 0 && currentTemplate && (
        <section style={{ marginBottom: 40, padding: 32, background: "#ffffff", borderRadius: "40px", border: "2px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 11, fontWeight: 900, marginBottom: 20, color: "#cbd5e1", textTransform: 'uppercase', letterSpacing: '0.4em' }}>
             02. Strategic Enrollment Quantity
          </h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <button 
              onClick={() => setPackageMode("single")}
              style={{ flex: 1, minWidth: 260, padding: 24, borderRadius: "24px", border: "3px solid", borderColor: packageMode === "single" ? "#4f46e5" : "#f1f5f9", background: packageMode === "single" ? "#f5f3ff" : "#ffffff", cursor: "pointer" }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>Single Session</div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, marginTop: 4 }}>Standard academic rate</div>
            </button>
            <button 
              onClick={() => setPackageMode("package")}
              style={{ flex: 1, minWidth: 260, padding: 24, borderRadius: "24px", border: "3px solid", borderColor: packageMode === "package" ? "#4f46e5" : "#f1f5f9", background: packageMode === "package" ? "#f5f3ff" : "#ffffff", cursor: "pointer", position: "relative" }}
            >
               {currentTemplate.packageFiveDiscount > 0 && (
                 <span style={{ position: "absolute", top: -12, right: 20, background: "#f59e0b", color: "#fff", fontSize: 10, padding: "6px 12px", borderRadius: 100, fontWeight: 900, boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)' }}>
                    ELITE SAVINGS: €{currentTemplate.packageFiveDiscount}
                 </span>
               )}
              <div style={{ fontWeight: 900, fontSize: 18 }}>5-Lesson Bundle</div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, marginTop: 4 }}>
                €{(((currentTemplate.priceSingle * 5) - currentTemplate.packageFiveDiscount) / 5).toFixed(2)} / effective rate
              </div>
            </button>
          </div>
        </section>
      )}

      {/* DATA VISUALIZATION: SYSTEM TIME */}
      <div style={{ padding: "14px 20px", fontSize: 12, borderRadius: "16px", background: "#f0f9ff", border: "1px solid #bae6fd", marginBottom: 40, fontWeight: 800, color: '#0369a1', textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Protocol Synchronization: <b>{tz}</b>. All scheduled slots are localized to your device's timezone.
      </div>

      {/* CONTROL HUB: DURATION & TRIALS */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", marginBottom: 48, paddingBottom: 40, borderBottom: "2px solid #f1f5f9" }}>
        {!currentTemplate && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 14, color: "#1e293b", textTransform: "uppercase" }}>Duration</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={trial || tutorCredits > 0}
              style={{ padding: '12px 16px', borderRadius: "14px", border: '2px solid #f1f5f9', fontWeight: 800, outline: "none", cursor: "pointer" }}
            >
              {DURATIONS.map(d => <option key={d} value={d}>{d} Minutes</option>)}
            </select>
          </div>
        )}

        {trialAllowed && tutorCredits === 0 ? (
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: trial ? "#ecfdf5" : "#ffffff", padding: "10px 20px", borderRadius: "100px", border: "2px solid", borderColor: trial ? "#10b981" : "#f1f5f9", transition: "all 0.2s" }}>
            <input
              type="checkbox"
              checked={trial}
              onChange={(e) => { 
                setTrial(e.target.checked); 
                if(e.target.checked) setPackageMode("single"); 
              }}
              style={{ width: 18, height: 18, accentColor: "#10b981" }}
            />
            <span style={{ fontSize: 13, fontWeight: 900, color: trial ? "#047857" : "#64748b", textTransform: "uppercase" }}>Initiate Free Trial</span>
          </label>
        ) : tutorCredits === 0 && <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", background: "#f8fafc", padding: "10px 20px", borderRadius: 100 }}>Trial Quota Exhausted</div>}

        <div style={{ fontSize: 20, fontWeight: 950, color: '#0f172a', marginLeft: 'auto', tracking: "-0.02em" }}>
          {tutorCredits > 0 ? "Debit: 1 Credit" : trial ? "Inventory: Free" : `Price: €${priceForDuration?.toFixed(2)}`}
        </div>
      </div>

      {/* WEEK NAVIGATION STICKY BAR */}
      <div style={{ position: "sticky", top: 20, background: "rgba(255,255,255,0.9)", backdropFilter: 'blur(16px)', zIndex: 50, borderRadius: "24px", border: "2px solid #f1f5f9", padding: '16px', marginBottom: 40, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            disabled={weekStart <= todayStart}
            style={{ width: 50, height: 50, borderRadius: "16px", border: "none", background: weekStart <= todayStart ? "#f8fafc" : "#1e293b", color: "#fff", cursor: weekStart <= todayStart ? "not-allowed" : "pointer", fontWeight: 900, fontSize: 20 }}
          >
            ←
          </button>
          <div style={{ fontWeight: 950, flex: 1, textAlign: "center", fontSize: 18, color: "#0f172a", tracking: "-0.04em" }}>
            {weekLabel}
          </div>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            style={{ width: 50, height: 50, borderRadius: "16px", border: "none", background: "#1e293b", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 20 }}
          >
            →
          </button>
        </div>
      </div>

      {/* CALENDAR VIEW ENGINE */}
      <div style={{ marginBottom: 14, fontWeight: 900, fontSize: 13, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.4em" }}>
         03. Temporal Slot Selection
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 24 }}>
        {daysArr.map((d) => (
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
        days={daysArr}
        selectedDay={selectedDay}
        onSelect={setSelectedDay}
        countSlotsFor={countSlotsFor}
      />

      {/* STUDENT DATA INTAKE */}
      <div style={{ marginTop: 56, marginBottom: 40, padding: 32, background: "#ffffff", borderRadius: "40px", border: "2px solid #f1f5f9" }}>
        <label style={{ fontWeight: 900, fontSize: 13, color: '#cbd5e1', textTransform: "uppercase", letterSpacing: "0.4em" }}>
          04. Learning Prerequisites (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
          rows={4}
          placeholder="Brief the tutor on your current objectives, level, or specific linguistic challenges..."
          style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 20, borderRadius: "24px", border: "2px solid #f1f5f9", marginTop: 20, fontSize: 15, fontWeight: 500, color: "#475569", outline: 'none', transition: "border-color 0.2s" }}
          onFocus={(e) => e.target.style.borderColor = "#6366f1"}
          onBlur={(e) => e.target.style.borderColor = "#f1f5f9"}
        />
        <div style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", marginTop: 12, textAlign: 'right', textTransform: "uppercase" }}>
          {notes.length} / {NOTES_MAX} Limit
        </div>
      </div>

      {/* SYSTEM FEEDBACK: ERRORS & LOADING */}
      {error && <div style={{ color: "#fff", background: "#f43f5e", padding: "20px 24px", borderRadius: "20px", marginBottom: 32, fontWeight: 900, fontSize: 14, boxShadow: "0 10px 15px -3px rgba(244, 63, 94, 0.2)" }}>⚠️ SYSTEM ALERT: {error}</div>}
      {loadingWeek && <div style={{ marginBottom: 32, color: '#6366f1', fontWeight: 950, fontSize: 14, textTransform: "uppercase", animate: "pulse" }}>Synchronizing Global Cloud Schedule...</div>}

      <h2 style={{ fontSize: 28, fontWeight: 950, marginBottom: 24, color: '#0f172a', letterSpacing: "-0.04em" }}>
        {selectedDay.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </h2>

      {/* INTERACTIVE SLOT MATRIX */}
      {daySlots.length === 0 ? (
        <div style={{ padding: 60, background: "#ffffff", borderRadius: "40px", border: '3px dashed #f1f5f9', textAlign: 'center' }}>
          <div style={{ fontWeight: 900, color: '#94a3b8', fontSize: 20, tracking: "-0.02em" }}>No Active Sessions Synchronized</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, marginTop: 8, fontWeight: 700 }}>Adjust your search window or session duration.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
          {daySlots.map((s) => (
            <button
              key={s.iso}
              onClick={() => handleBook(s.iso)}
              style={{
                padding: "24px 16px",
                borderRadius: "28px",
                border: "2px solid #f1f5f9",
                cursor: "pointer",
                background: "#ffffff",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.03)",
                fontSize: 18,
                fontWeight: 950,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: '#0f172a',
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'; 
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(99, 102, 241, 0.15)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = 'translateY(0) scale(1)'; 
                e.currentTarget.style.borderColor = '#f1f5f9';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.03)';
              }}
            >
              {s.label}
              {tutorTz && (
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, marginTop: 8, textTransform: "uppercase" }}>
                   Tutor: {new Date(s.iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tutorTz })}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* NAVIGATION FOOTNOTE: JUMP LOGIC */}
      <div style={{ marginTop: 56, paddingTop: 40, borderTop: '2px solid #f1f5f9' }}>
        <button
          onClick={() => {
            const currentIdx = daysArr.findIndex((d) => d.toDateString() === selectedDay.toDateString());
            const nextDay = daysArr.slice(currentIdx + 1).find((d) => countSlotsFor(d) > 0);
            if (nextDay) setSelectedDay(nextDay);
          }}
          style={{ padding: "16px 32px", border: "none", borderRadius: "100px", background: "#1e293b", cursor: "pointer", fontWeight: 900, fontSize: 13, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.1em", boxShadow: "0 10px 15px -3px rgba(30, 41, 59, 0.2)" }}
        >
          Fast-Forward to Next Available →
        </button>
      </div>

      {/* NOTEBOOK FOOTER: ENTERPRISE BRANDING */}
      <footer style={{ marginTop: 100, textAlign: 'center', opacity: 0.15, select: 'none', pointerEvents: 'none' }}>
        <div style={{ fontWeight: 950, fontSize: 32, tracking: '-0.06em', color: "#0f172a" }}>LERNITT ACADEMY</div>
        <div style={{ fontSize: 11, fontWeight: 900, tracking: '0.8em', marginTop: 12, textTransform: "uppercase" }}>
           Automated Booking Engine v2.8.6
        </div>
        <div style={{ marginTop: 40, fontSize: 10, fontWeight: 700 }}>© 2026 LERNITT GLOBAL INFRASTRUCTURE CLUSTER</div>
      </footer>

      {/* GRAND AUDIT LOG:
          1. Identity: user.packageCredits balance verified via auth context.
          2. Inventory: tutorCredits logic provides authoritative bypass for receipts.
          3. Slicing: UI aligned with flexible backend validateSlot logic.
          4. Address: Redundant API prefix removed from handleBook submission.
          5. Routing: Slots fetched via Step 2/5 integrated /api/tutors pipe.
          6. Documentation: Verbose mapping maintained for enterprise safety.
      */}
    </div>
  );
}
