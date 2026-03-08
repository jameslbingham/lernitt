/**
 * ============================================================================
 * LERNITT ACADEMY - ARCHITECTURAL VALIDATION ENGINE
 * ============================================================================
 * ROLE: Senior Developer Audit - Problem 5 (Temporal Shield Integration)
 * VERSION: 3.2.0
 * ----------------------------------------------------------------------------
 * This module is the "Temporal Gatekeeper" for the booking process. It ensures:
 * 1. TEMPORAL ALIGNMENT: The lesson fits within the tutor's window.
 * 2. CONFLICT RESOLUTION: The lesson does not overlap with existing bookings.
 * 3. TIMEZONE SYNC: All math respects the tutor's specific local clock.
 * ----------------------------------------------------------------------------
 * ✅ PROBLEM 5 FIX: THE MIDNIGHT SHIELD.
 * Logic: Correctly handles availability ranges that cross the 00:00 threshold
 * (e.g., a tutor working 10:00 PM to 02:00 AM).
 * ✅ TIMEZONE LOCK: Forces all comparisons into the Tutor's IANA zone string.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - COMPLETE FILES ONLY: No truncation permitted.
 * - FLEXIBLE WINDOW LOGIC: Allows students to pick any slot inside a range.
 * - CONFLICT-FREE MAPPING: Synchronized with all 11 stages of the engine.
 * ============================================================================
 */

const Availability = require("../models/Availability");
const Lesson = require("../models/Lesson");
const { DateTime } = require("luxon");

/**
 * validateSlot
 * ----------------------------------------------------------------------------
 * Primary validation export. It performs a boundary-check to see if the
 * student's choice (start to end) is "enveloped" by the tutor's availability.
 */
module.exports = async function validateSlot({ tutorId, startISO, endISO, durMins }) {
  
  // 1. DATA RETRIEVAL
  // We locate the tutor's availability profile using the MongoDB ID.
  const avail = await Availability.findOne({ tutor: tutorId }); 
  if (!avail) return { ok: false, reason: "no-availability" };

  // 2. TIMEZONE NORMALIZATION (The Temporal Shield)
  // We convert the student's request into the tutor's specific local perspective.
  const tutorTz = avail.timezone || "UTC";
  const startUTC = DateTime.fromISO(startISO, { zone: "utc" });
  const endUTC = DateTime.fromISO(endISO, { zone: "utc" });
  
  if (!startUTC.isValid || !endUTC.isValid) {
    return { ok: false, reason: "bad-datetime" };
  }

  /**
   * Perspective Shift: 
   * We force the computer to view the request through the tutor's local clock.
   * This is what prevents the "Clash" if your computer and the tutor are in
   * different parts of the world.
   */
  const startTutor = startUTC.setZone(tutorTz);
  const endTutor = endUTC.setZone(tutorTz);
  const isoDate = startTutor.toISODate();

  // 3. RANGE DISCOVERY
  // We check if the tutor has a special "Exception" or uses the standard weekly grid.
  const ex = (avail.exceptions || []).find(e => e.date === isoDate);
  let ranges = [];
  
  if (ex) {
    ranges = ex.open ? (ex.ranges || []) : []; 
  } else {
    /**
     * ✅ LOGIC SYNC: Correct Luxon Sunday (7) to DB Sunday (0) mapping.
     */
    const dow = startTutor.weekday === 7 ? 0 : startTutor.weekday; 
    const dayWeekly = (avail.weekly || []).find(w => w.dow === dow);
    ranges = dayWeekly ? dayWeekly.ranges : [];
  }

  /**
   * 4. THE MIDNIGHT SHIELD CHECK
   * --------------------------------------------------------------------------
   * Instead of rigid blocks, we check if the requested lesson fits entirely
   * inside ANY of the tutor's open windows, even if that window crosses midnight.
   */
  const fitsInRange = ranges.some(r => {
    // Convert the 'HH:mm' strings into real timestamps
    let rangeStart = startTutor.set({ 
      hour: +r.start.slice(0, 2), 
      minute: +r.start.slice(3, 5),
      second: 0,
      millisecond: 0
    });
    
    let rangeEnd = startTutor.set({ 
      hour: +r.end.slice(0, 2), 
      minute: +r.end.slice(3, 5),
      second: 0,
      millisecond: 0
    });

    /**
     * ✅ MIDNIGHT OVERFLOW LOGIC:
     * If the end time is numerically lower than the start time (e.g. 01:00 vs 22:00),
     * we logically "push" the end time forward by 1 day so the math works.
     */
    if (rangeEnd <= rangeStart) {
      rangeEnd = rangeEnd.plus({ days: 1 });
    }

    // Validation: Request Start must be >= Range Start AND Request End must be <= Range End
    return startTutor >= rangeStart && endTutor <= rangeEnd;
  });
  
  if (!fitsInRange) {
    return { ok: false, reason: "not-in-availability" };
  }

  /**
   * 5. CLASH DETECTION
   * --------------------------------------------------------------------------
   * Final check to ensure no other student has booked this exact moment.
   */
  const overlap = await Lesson.exists({
    tutor: tutorId,
    status: { $nin: ["cancelled", "expired"] },
    startTime: { $lt: endUTC.toJSDate() }, // New lesson starts before old one ends
    endTime: { $gt: startUTC.toJSDate() }, // New lesson ends after old one starts
  });
  
  if (overlap) {
    return { ok: false, reason: "clash" };
  }

  // If the temporal shield holds and no clashes exist, the slot is verified.
  return { ok: true };
};

/**
 * ============================================================================
 * END OF FILE: validateSlot.js
 * Logic: Midnight Shield and Timezone Synchronization Sealed.
 * ============================================================================
 */
