// server/utils/validateSlot.js
const Availability = require("../models/Availability");
const Lesson = require("../models/Lesson");
const { DateTime } = require("luxon");

function sliceDaySlots(day, ranges, durMins) {
  const out = [];
  for (const r of ranges) {
    // Fixed: Using + prefix to ensure numeric conversion for HH:mm slicing
    const s = day.set({ hour: +r.start.slice(0, 2), minute: +r.start.slice(3) });
    const e = day.set({ hour: +r.end.slice(0, 2), minute: +r.end.slice(3) });
    let cur = s;
    while (cur.plus({ minutes: durMins }) <= e) {
      out.push({ s: cur, e: cur.plus({ minutes: durMins }) });
      cur = cur.plus({ minutes: durMins });
    }
  }
  return out;
}

module.exports = async function validateSlot({ tutorId, startISO, endISO, durMins }) {
  // ✅ FIXED: Changed 'tutorId' to 'tutor' to match your Availability schema
  const avail = await Availability.findOne({ tutor: tutorId }); 
  if (!avail) return { ok: false, reason: "no-availability" };

  const tutorTz = avail.timezone || "UTC";
  const startUTC = DateTime.fromISO(startISO, { zone: "utc" });
  const endUTC = DateTime.fromISO(endISO, { zone: "utc" });
  
  if (!startUTC.isValid || !endUTC.isValid) return { ok: false, reason: "bad-datetime" };

  // Convert to tutor’s day for rules lookup
  const day = startUTC.setZone(tutorTz).startOf("day");
  const isoDate = day.toISODate();

  const ex = (avail.exceptions || []).find(e => e.date === isoDate);
  let ranges = [];
  
  if (ex) {
    // ✅ FIXED: Using 'ranges' instead of 'slots' to match your ExceptionSchema
    ranges = ex.open ? (ex.ranges || []) : []; 
  } else {
    // ✅ FIXED: Correct Luxon Sunday (7) to DB Sunday (0) mapping
    const dow = day.weekday === 7 ? 0 : day.weekday; 
    const dayWeekly = (avail.weekly || []).find(w => w.dow === dow);
    ranges = dayWeekly ? dayWeekly.ranges : [];
  }

  // Make allowed blocks for that day
  const blocks = sliceDaySlots(day, ranges, durMins).map(b => ({
    sUTC: b.s.toUTC(),
    eUTC: b.e.toUTC(),
  }));

  const req = { sUTC: startUTC, eUTC: endUTC };

  // Must match one allowed block exactly
  const matches = blocks.some(b => 
    b.sUTC.hasSame(req.sUTC, 'millisecond') && b.eUTC.hasSame(req.eUTC, 'millisecond')
  );
  
  if (!matches) return { ok: false, reason: "not-in-availability" };

  // Clash check with existing lessons
  const overlap = await Lesson.exists({
    tutor: tutorId,
    status: { $nin: ["cancelled", "expired"] }, // ✅ FIXED: Better status exclusion
    startTime: { $lt: req.eUTC.toJSDate() },
    endTime: { $gt: req.sUTC.toJSDate() },
  });
  
  if (overlap) return { ok: false, reason: "clash" };

  return { ok: true };
};
