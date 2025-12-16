// /server/routes/availability.js
const express = require("express");
const Availability = require("../models/Availability");
const Lesson = require("../models/Lesson");
const { DateTime } = require("luxon");

const router = express.Router();

/* ---------- helper functions ---------- */
function snapToPolicy(dt, policy) {
  if (policy !== "hourHalf") return dt;
  const minute = dt.minute;
  if (minute === 0 || minute === 30) {
    return dt.set({ second: 0, millisecond: 0 });
  }
  return minute < 30
    ? dt.set({ minute: 30, second: 0, millisecond: 0 })
    : dt.plus({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 });
}

function sliceDaySlots(day, ranges, durMins, policy, interval) {
  const out = [];
  const step = Math.max(5, Number(interval) || 30);

  for (const r of ranges) {
    let s = day.set({
      hour: Number(r.start.slice(0, 2)),
      minute: Number(r.start.slice(3)),
      second: 0,
      millisecond: 0,
    });
    const e = day.set({
      hour: Number(r.end.slice(0, 2)),
      minute: Number(r.end.slice(3)),
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

/* Convert UI "rules" (Mon..Sun arrays) → DB weekly format */
function rulesToWeekly(rules) {
  if (!Array.isArray(rules) || rules.length !== 7) return null;

  // Mon..Sun indexes → DB dow (0 = Sun, 1 = Mon, … 6 = Sat)
  const dowMap = [1, 2, 3, 4, 5, 6, 0];
  const weekly = [];

  rules.forEach((dayRanges, idx) => {
    if (!Array.isArray(dayRanges) || dayRanges.length === 0) return;

    const safeRanges = dayRanges
      .filter((r) => r && typeof r.start === "string" && typeof r.end === "string")
      .map((r) => ({ start: r.start, end: r.end }));

    if (safeRanges.length) {
      weekly.push({ dow: dowMap[idx], ranges: safeRanges });
    }
  });

  return weekly;
}

/* ---------- routes: tutor self + admin ---------- */

// GET /api/availability/me
router.get("/me", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const av = await Availability.findOne({ tutor: req.user.id });
    res.json(av || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your availability" });
  }
});

// DELETE /api/availability/all  (admin only)
router.delete("/all", async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await Availability.deleteMany({});
    res.json({ ok: true, message: "All availabilities cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear availabilities" });
  }
});

/* ---------- routes: exceptions ---------- */

// POST /api/availability/exceptions
router.post("/exceptions", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { date, open, ranges = [] } = req.body || {};

    if (!date || typeof open !== "boolean") {
      return res.status(400).json({ error: "date and open are required" });
    }

    if (open && !Array.isArray(ranges)) {
      return res
        .status(400)
        .json({ error: "ranges must be an array when open=true" });
    }

    const av = await Availability.findOne({ tutor: req.user.id });
    if (!av) {
      return res.status(404).json({ error: "Availability not found" });
    }

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
router.delete("/exceptions/:date", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { date } = req.params;

    const av = await Availability.findOne({ tutor: req.user.id });
    if (!av) {
      return res.status(404).json({ error: "Availability not found" });
    }

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

/* ---------- routes: public slots + load by tutor ---------- */

// GET /api/availability/:tutorId/slots
router.get("/:tutorId/slots", async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { from, to } = req.query;
    const dur = Math.max(15, parseInt(req.query.dur || "60", 10));
    const studentTz = req.query.tz || "UTC";

    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    const avail = await Availability.findOne({ tutor: tutorId });
    if (!avail) {
      return res.json([]);
    }

    const tutorTz = avail.timezone || "UTC";
    const policy = avail.slotStartPolicy || "hourHalf";
    const interval = Number(avail.slotInterval) || 30;

    let day = DateTime.fromISO(from, { zone: tutorTz }).startOf("day");
    const last = DateTime.fromISO(to, { zone: tutorTz }).endOf("day");
    const resultsUTC = [];

    while (day <= last) {
      const isoDate = day.toISODate();
      const ex = (avail.exceptions || []).find((e) => e.date === isoDate);

      let ranges = [];
      if (ex) {
        ranges = ex.open ? (ex.ranges || []) : [];
      } else {
        // ✅ Correct weekly DOW mapping (Luxon Sunday=7 → DB Sunday=0)
        const dowIndex = day.weekday === 7 ? 0 : day.weekday;
        const dayWeekly = (avail.weekly || []).filter((w) => w.dow === dowIndex);
        ranges = dayWeekly.flatMap((w) => w.ranges || []);
      }

      if (!ranges.length) {
        day = day.plus({ days: 1 }).startOf("day");
        continue;
      }

      const dayBlocks = sliceDaySlots(day, ranges, dur, policy, interval);
      if (!dayBlocks.length) {
        day = day.plus({ days: 1 }).startOf("day");
        continue;
      }

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
        const slotUTCs = {
          s: b.toUTC(),
          e: b.plus({ minutes: dur }).toUTC(),
        };

        const overlaps = blocked.some(
          (x) =>
            (slotUTCs.s >= x.s && slotUTCs.s < x.e) ||
            (slotUTCs.e > x.s && slotUTCs.e <= x.e)
        );

        if (!overlaps) {
          resultsUTC.push(slotUTCs.s.toISO());
        }
      }

      day = day.plus({ days: 1 }).startOf("day");
    }

    const slotsInStudentTz = resultsUTC.map((iso) =>
      DateTime.fromISO(iso, { zone: "utc" }).setZone(studentTz).toISO()
    );

    res.json(slotsInStudentTz);
  } catch (err) {
    console.error("slots error", err);
    res.status(500).json({ error: "Failed to generate slots" });
  }
});

// GET /api/availability/:tutorId
router.get("/:tutorId", async (req, res) => {
  try {
    const doc = await Availability.findOne({ tutor: req.params.tutorId });
    res.json(doc || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load availability" });
  }
});

/* ---------- routes: update base availability ---------- */

// PUT /api/availability
router.put("/", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const tutor = req.user.id;
    const {
      timezone,
      weekly = [],
      exceptions = [],
      slotInterval = 30,
      slotStartPolicy = "hourHalf",
      // new fields from Availability.jsx UI:
      rules,
      startDate,
      repeat,
      untilMode,
      untilDate,
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

    if (timezone) {
      doc.timezone = timezone;
    }

    // Prefer UI "rules" if present, otherwise accept raw weekly from body
    const weeklyFromRules = rulesToWeekly(rules);
    doc.weekly = weeklyFromRules || (Array.isArray(weekly) ? weekly : []);

    doc.exceptions = Array.isArray(exceptions) ? exceptions : [];
    doc.slotInterval = Number(slotInterval) || 30;
    doc.slotStartPolicy = slotStartPolicy || "hourHalf";

    // Optional window fields (used by UI; safe even if schema ignores them)
    if (startDate) doc.startDate = startDate;
    if (repeat) doc.repeat = repeat;
    if (untilMode) doc.untilMode = untilMode;
    if (typeof untilDate === "string") doc.untilDate = untilDate;

    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save availability" });
  }
});

module.exports = router;
