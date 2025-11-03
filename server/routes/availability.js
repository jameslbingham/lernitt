// server/routes/availability.js
const express = require("express");
const Availability = require("../models/Availability");
const Lesson = require("../models/Lesson");
const auth = require("../middleware/auth");
const { DateTime } = require("luxon");

const router = express.Router();

/* ---------- helpers ---------- */
function snapToPolicy(dt, policy) {
  if (policy !== "hourHalf") return dt;
  const minute = dt.minute;
  if (minute === 0 || minute === 30) return dt.set({ second: 0, millisecond: 0 });
  return minute < 30
    ? dt.set({ minute: 30, second: 0, millisecond: 0 })
    : dt.plus({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 });
}

function sliceDaySlots(day, ranges, durMins, policy, interval) {
  const out = [];
  const step = Math.max(5, Number(interval) || 30);

  for (const r of ranges) {
    let s = day.set({
      hour: +r.start.slice(0, 2),
      minute: +r.start.slice(3),
      second: 0,
      millisecond: 0,
    });
    const e = day.set({
      hour: +r.end.slice(0, 2),
      minute: +r.end.slice(3),
      second: 0,
      millisecond: 0,
    });

    s = snapToPolicy(s, policy);

    while (s.plus({ minutes: durMins }) <= e) {
      out.push(s);
      s = snapToPolicy(s.plus({ minutes: step }), policy);
    }
  }
  return out;
}

/* ---------- basic load/update ---------- */
// GET /api/availability/:tutorId
router.get("/:tutorId", async (req, res) => {
  try {
    const doc = await Availability.findOne({ tutor: req.params.tutorId });
    res.json(doc || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load availability" });
  }
});

// PUT /api/availability
router.put("/", auth, async (req, res) => {
  try {
    const tutor = req.user.id;
    const {
      timezone,
      weekly = [],         // [{ dow, ranges:[{start,end}] }]
      exceptions = [],     // [{ date, open, ranges:[{start,end}] }]
      slotInterval = 30,
      slotStartPolicy = "hourHalf",
    } = req.body || {};

    let doc = await Availability.findOne({ tutor });
    if (!doc) {
      doc = new Availability({
        tutor,
        timezone: timezone || "UTC",
        weekly: [],
        exceptions: [],
      });
    }

    if (timezone) doc.timezone = timezone;
    doc.weekly = Array.isArray(weekly) ? weekly : [];
    doc.exceptions = Array.isArray(exceptions) ? exceptions : [];
    doc.slotInterval = Number(slotInterval) || 30;
    doc.slotStartPolicy = slotStartPolicy === "hourHalf" ? "hourHalf" : "hourHalf";

    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save availability" });
  }
});

/* ---------- exceptions API ---------- */
// POST /api/availability/exceptions  { date, open, ranges:[{start,end}] }
router.post("/exceptions", auth, async (req, res) => {
  try {
    const { date, open, ranges = [] } = req.body || {};
    if (!date || typeof open !== "boolean") {
      return res.status(400).json({ error: "date and open are required" });
    }
    if (open && !Array.isArray(ranges)) {
      return res.status(400).json({ error: "ranges must be an array" });
    }

    const av = await Availability.findOne({ tutor: req.user.id });
    if (!av) return res.status(404).json({ error: "Availability not found" });

    // replace any existing exception for that date
    av.exceptions = (av.exceptions || []).filter((e) => e.date !== date);
    av.exceptions.push({ date, open, ranges: open ? ranges : [] });
    await av.save();

    res.json({ ok: true, availability: av });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save exception" });
  }
});

// DELETE /api/availability/exceptions/:date
router.delete("/exceptions/:date", auth, async (req, res) => {
  try {
    const { date } = req.params;
    const av = await Availability.findOne({ tutor: req.user.id });
    if (!av) return res.status(404).json({ error: "Availability not found" });

    const before = (av.exceptions || []).length;
    av.exceptions = (av.exceptions || []).filter((e) => e.date !== date);
    if (av.exceptions.length === before) {
      return res.status(404).json({ error: "Exception not found" });
    }

    await av.save();
    res.json({ ok: true, availability: av });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete exception" });
  }
});

/* ---------- slots API: GET /:tutorId/slots?from&to&dur&tz ---------- */
router.get("/:tutorId/slots", async (req, res) => {
  try {
    const { tutorId } = req.params;
    const from = req.query.from; // YYYY-MM-DD
    const to = req.query.to;     // YYYY-MM-DD
    const dur = Math.max(15, parseInt(req.query.dur || "60", 10)); // minutes
    const studentTz = req.query.tz || "UTC";

    const avail = await Availability.findOne({ tutor: tutorId });
    if (!avail) return res.json([]);

    const tutorTz = avail.timezone || "UTC";
    const policy = avail.slotStartPolicy || "hourHalf";
    const interval = Number(avail.slotInterval) || 30;

    let day = DateTime.fromISO(from, { zone: tutorTz }).startOf("day");
    const last = DateTime.fromISO(to, { zone: tutorTz }).endOf("day");

    const resultsUTC = [];

    while (day <= last) {
      const isoDate = day.toISODate();

      // exceptions win; if open=false → closed
      const ex = (avail.exceptions || []).find((e) => e.date === isoDate);
      let ranges = [];
      if (ex) {
        ranges = ex.open ? (ex.ranges || []) : [];
      } else {
        // weekly.dow uses 0=Sun..6=Sat ; Luxon weekday: 1..7 (Mon..Sun)
        const dowIndex = day.weekday % 7; // Sun -> 0
        const dayWeekly = (avail.weekly || []).filter((w) => w.dow === dowIndex);
        ranges = dayWeekly.flatMap((w) => w.ranges || []);
      }

      if (ranges.length) {
        // slice ranges into slots using policy + interval (tutor tz)
        const dayBlocks = sliceDaySlots(day, ranges, dur, policy, interval);

        if (dayBlocks.length) {
          const dayStartUTC = day.toUTC();
          const dayEndUTC = day.endOf("day").toUTC();

          const lessons = await Lesson.find({
            tutor: tutorId,
            startTime: { $lt: dayEndUTC.toJSDate() },
            endTime: { $gt: dayStartUTC.toJSDate() },
            status: { $ne: "cancelled" },
          }).select("startTime endTime");

          const blocked = lessons.map((l) => ({
            s: DateTime.fromJSDate(l.startTime).toUTC(),
            e: DateTime.fromJSDate(l.endTime).toUTC(),
          }));

          for (const b of dayBlocks) {
            const slotUTCs = { s: b.toUTC(), e: b.plus({ minutes: dur }).toUTC() };
            const overlaps = blocked.some(
              (x) => slotUTCs.s < x.e && slotUTCs.e > x.s
            );
            if (!overlaps) resultsUTC.push(slotUTCs.s.toISO());
          }
        }
      }

      day = day.plus({ days: 1 }).startOf("day");
    }

    // convert to student tz for display
    const slotsInStudentTz = resultsUTC.map((iso) =>
      DateTime.fromISO(iso, { zone: "utc" }).setZone(studentTz).toISO()
    );

    res.json(slotsInStudentTz);
  } catch (e) {
    console.error("slots error", e);
    res.status(500).json({ error: "Failed to generate slots" });
  }
});

module.exports = router;
