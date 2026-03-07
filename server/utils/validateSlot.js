/**
 * ============================================================================
 * LERNITT ACADEMY - ARCHITECTURAL VALIDATION ENGINE
 * ============================================================================
 * ROLE: Senior Developer Audit - Step 5 (Flexible Selection Plumbing)
 * VERSION: 3.1.0
 * ----------------------------------------------------------------------------
 * This module is the "Safety Gate" for the booking process. It ensures:
 * 1. TEMPORAL ALIGNMENT: The requested lesson fits within the tutor's window.
 * 2. CONFLICT RESOLUTION: The lesson does not overlap with existing bookings.
 * 3. TIMEZONE SYNC: All calculations respect the tutor's specific local time.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - COMPLETE FILES ONLY: No truncation permitted.
 * - FLEXIBLE WINDOW LOGIC: Replaces rigid slicing to prevent student rejection.
 * - CONFLICT-FREE MAPPING: Synchronized with Steps 1, 2, 3, and 4.
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
  // 1. DATA RETRIEVAL (Handshake with Step 2)
  // We locate the tutor's availability profile using the MongoDB ID badge.
  const avail = await Availability.findOne({ tutor: tutorId }); 
  if (!avail) return { ok: false, reason: "no-availability" };

  // 2. TIMEZONE NORMALIZATION
  // We convert the student's request into the tutor's perspective.
  const tutorTz = avail.timezone || "UTC";
  const startUTC = DateTime.fromISO(startISO, { zone: "utc" });
  const endUTC = DateTime.fromISO(endISO, { zone: "utc" });
  
  if (!startUTC.isValid || !endUTC.isValid) {
    return { ok: false, reason: "bad-datetime" };
  }

  // Perspective Shift: View the request through the tutor's local clock
  const startTutor = startUTC.setZone(tutorTz);
  const endTutor = endUTC.setZone(tutorTz);
  const isoDate = startTutor.toISODate();

  // 3. RANGE DISCOVERY (Handshake with Step 2 Exceptions)
  // We check if the tutor has a special "Exception" for this specific day.
  const ex = (avail.exceptions || []).find(e => e.date === isoDate);
  let ranges = [];
  
  if (ex) {
    // If an exception exists, we use those specific hours.
    ranges = ex.open ? (ex.ranges || []) : []; 
  } else {
    /**
     * ✅ LOGIC SYNC: Correct Luxon Sunday (7) to DB Sunday (0) mapping.
     * This prevents the "Calendar Drift" conflict found in the audit.
     */
    const dow = startTutor.weekday === 7 ? 0 : startTutor.weekday; 
    const dayWeekly = (avail.weekly || []).find(w => w.dow === dow);
    ranges = dayWeekly ? dayWeekly.ranges : [];
  }

  /**
   * 4. FLEXIBLE PLUMBING CHECK
   * --------------------------------------------------------------------------
   * Instead of slicing time into rigid 60-min blocks, we check if the requested 
   * lesson fits entirely inside ANY of the tutor's open windows for that day.
   */
  const fitsInRange = ranges.some(r => {
    // Convert the 'HH:mm' strings into real timestamps for the boundary check
    const rangeStart = startTutor.set({ 
      hour: +r.start.slice(0, 2), 
      minute: +r.start.slice(3, 5),
      second: 0,
      millisecond: 0
    });
    
    const rangeEnd = startTutor.set({ 
      hour: +r.end.slice(0, 2), 
      minute: +r.end.slice(3, 5),
      second: 0,
      millisecond: 0
    });

    // Valid if: Request Start is >= Range Start AND Request End is <= Range End
    return startTutor >= rangeStart && endTutor <= rangeEnd;
  });
  
  if (!fitsInRange) {
    return { ok: false, reason: "not-in-availability" };
  }

  /**
   * 5. CLASH DETECTION (Handshake with Step 6)
   * --------------------------------------------------------------------------
   * We verify that another student hasn't already paid for this specific time.
   * We ignore 'cancelled' or 'expired' lessons to keep the pipe open for others.
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

  // If all temporal and logical checks pass, the slot is verified.
  return { ok: true };
};

/**
 * ============================================================================
 * END OF FILE: validateSlot.js
 * Logic: Flexible Boundary Validation Synchronized.
 * ============================================================================
 */
