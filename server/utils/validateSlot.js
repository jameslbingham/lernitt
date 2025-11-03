// server/utils/validateSlot.js
const Availability = require("../models/Availability");
const Lesson = require("../models/Lesson");
const { DateTime } = require("luxon");

function sliceDaySlots(day, ranges, durMins) {
  const out = [];
  for (const r of ranges) {
    const s = day.set({ hour: +r.start.slice(0,2), minute: +r.start.slice(3) });
    const e = day.set({ hour: +r.end.slice(0,2),   minute: +r.end.slice(3) });
    let cur = s;
    while (cur.plus({ minutes: durMins }) <= e) {
      out.push({ s: cur, e: cur.plus({ minutes: durMins }) });
      cur = cur.plus({ minutes: durMins });
    }
  }
  return out;
}

module.exports = async function validateSlot({ tutorId, startISO, endISO, durMins }) {
  const avail = await Availability.findOne({ tutorId });
  if (!avail) return { ok: false, reason: "no-availability" };

  const tutorTz = avail.timezone || "UTC";
  const startUTC = DateTime.fromISO(startISO, { zone: "utc" });
  const endUTC   = DateTime.fromISO(endISO,   { zone: "utc" });
  if (!startUTC.isValid || !endUTC.isValid) return { ok: false, reason: "bad-datetime" };

  // Convert to tutor’s day
  const day = startUTC.setZone(tutorTz).startOf("day");
  const isoDate = day.toISODate();

  const ex = (avail.exceptions || []).find(e => e.date === isoDate);
  let ranges;
  if (ex) ranges = ex.slots || [];
  else {
    const dow = day.weekday % 7; // luxon: 1..7
    ranges = (avail.weekly || []).filter(w => w.dow === (dow === 7 ? 0 : dow));
  }

  // Make allowed blocks for that day (in tutor tz)
  const blocks = sliceDaySlots(day, ranges, durMins).map(b => ({
    sUTC: b.s.toUTC(),
    eUTC: b.e.toUTC(),
  }));

  // Requested slot
  const req = { sUTC: startUTC, eUTC: endUTC };

  // Must match one allowed block exactly
  const matches = blocks.some(b => b.sUTC.equals(req.sUTC) && b.eUTC.equals(req.eUTC));
  if (!matches) return { ok: false, reason: "not-in-availability" };

  // Clash check with existing lessons
  const overlap = await Lesson.exists({
    tutor: tutorId,
    status: { $ne: "cancelled" },
    startTime: { $lt: req.eUTC.toJSDate() },
    endTime:   { $gt: req.sUTC.toJSDate() },
  });
  if (overlap) return { ok: false, reason: "clash" };

  return { ok: true };
};
