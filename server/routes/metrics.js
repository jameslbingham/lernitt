// /server/routes/metrics.js
// Admin Metrics API — mock-first, contract-aligned (CommonJS)

// -------------------- IMPORTS (converted) --------------------
const express = require("express");
const router = express.Router();

// -------- Config (mock toggle) --------
const MOCK =
  String(process.env.VITE_MOCK ?? process.env.METRICS_MOCK ?? "1") === "1";

// -------- Small helpers --------
const pad = (n) => String(n).padStart(2, "0");
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

function lastNMonths(n = 12) {
  const arr = [];
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(base.getMonth() - i);
    arr.push(monthKey(d));
  }
  return arr;
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function weighted(parts) {
  const s = parts.reduce((a, x) => a + x, 0) || 1;
  return parts.map((x) => Math.round((x / s) * 100));
}

// ===== Existing route (preserved) =====
router.get("/health", (req, res) => {
  res.json({ ok: true, service: "metrics", ts: new Date().toISOString() });
});

// ===== Growth & Conversion =====
router.get("/growth", async (req, res) => {
  if (MOCK) {
    const months = lastNMonths(12);

    const signups = rand(800, 1500);
    const first = Math.round((signups * rand(35, 55)) / 100);
    const repeat = Math.round((first * rand(45, 70)) / 100);
    const funnel = [
      { stage: "Sign-ups", value: signups },
      { stage: "First booking", value: first },
      { stage: "Repeat booking", value: repeat },
    ];

    const timeToFirstBooking = Array.from({ length: 31 }).map((_, d) => ({
      days: d,
      users: clamp(Math.round((30 - d) * 4 + Math.random() * 10), 0, 160),
    }));

    const monthlyStudents = months.map((m) => ({
      month: m,
      new: rand(120, 260),
      returning: rand(220, 520),
    }));

    const monthlyTutors = months.map((m) => ({
      month: m,
      new: rand(10, 35),
      active: rand(80, 160),
    }));

    const countries = ["US", "GB", "DE", "FR", "ES", "IT", "NL", "CA", "AU"];
    const conversionByCountry = countries.map((c) => {
      const s = rand(80, 600);
      const fb = rand(Math.round(s * 0.25), Math.round(s * 0.6));
      return { country: c, rate: Math.round((fb / s) * 1000) / 10, signups: s };
    });

    const sources = ["Google", "Meta", "Referral", "Direct", "Email"];
    const conversionBySource = sources.map((s) => {
      const su = rand(60, 400);
      const fb = rand(Math.round(su * 0.2), Math.round(su * 0.55));
      return {
        source: s,
        signups: su,
        firstBookings: fb,
        rate: Math.round((fb / su) * 1000) / 10,
      };
    });

    return res.json({
      funnel,
      timeToFirstBooking,
      monthlyStudents,
      monthlyTutors,
      conversionByCountry,
      conversionBySource,
    });
  }

  return res.json({
    funnel: [],
    timeToFirstBooking: [],
    monthlyStudents: [],
    monthlyTutors: [],
    conversionByCountry: [],
    conversionBySource: [],
  });
});

// ===== Lessons & Engagement =====
router.get("/lessons", async (req, res) => {
  if (MOCK) {
    const months = lastNMonths(12);

    const distCounts = weighted([35, 22, 14, 9, 6, 5, 3, 2, 2, 1, 1]);
    const lessonsPerStudentDist = distCounts.map((pct, i) => ({
      lessons: i === 10 ? "11+" : String(i + 1),
      students: Math.round(pct * 8 + rand(0, 12)),
    }));

    const tutorActivity = months.map((m) => ({
      month: m,
      lessons: rand(500, 1100),
      hours: rand(700, 1800),
    }));

    const over3Rate = rand(38, 62) / 100;
    const oneAndDoneRate = rand(12, 26) / 100;
    const thresholdKpis = { over3Rate, oneAndDoneRate };

    const heatmapHourDay = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const base = [19, 20, 21].includes(hour)
          ? rand(35, 70)
          : rand(4, 28);
        heatmapHourDay.push({ hour, day, count: base });
      }
    }

    const tb = weighted([18, 76, 6]);
    const typeBreakdown = [
      { type: "trial", count: tb[0] * 10 },
      { type: "paid", count: tb[1] * 10 },
      { type: "group", count: tb[2] * 10 },
    ];

    const reliabilityRates = months.map((m) => ({
      month: m,
      cancellation: rand(3, 10) / 100,
      reschedule: rand(4, 12) / 100,
      noShow: rand(1, 5) / 100,
    }));

    const durationVariance = months.map((m) => {
      const booked = rand(38, 46) * 10;
      const actual = booked - rand(-20, 30);
      return { month: m, bookedMins: booked, actualMins: actual };
    });

    return res.json({
      lessonsPerStudentDist,
      tutorActivity,
      thresholdKpis,
      heatmapHourDay,
      typeBreakdown,
      reliabilityRates,
      durationVariance,
    });
  }

  return res.json({
    lessonsPerStudentDist: [],
    tutorActivity: [],
    thresholdKpis: { over3Rate: 0, oneAndDoneRate: 0 },
    heatmapHourDay: [],
    typeBreakdown: [],
    reliabilityRates: [],
    durationVariance: [],
  });
});

// ===== Financials & Pricing =====
router.get("/financials", async (req, res) => {
  if (MOCK) {
    const months = lastNMonths(12);
    const categories = ["English", "Spanish", "German", "French", "Math", "Coding"];
    const countries = ["US", "GB", "DE", "FR", "ES", "IT", "NL", "CA", "AU"];

    const revenueByCategory = categories.map((c) => ({
      category: c,
      revenue: rand(8000, 42000),
    }));
    const revenueByCountry = countries.map((c) => ({
      country: c,
      revenue: rand(6000, 38000),
    }));
    const arpuTrend = months.map((m) => ({ month: m, arpu: rand(42, 86) }));
    const revenuePerTutorTrend = months.map((m) => ({
      month: m,
      revenuePerTutor: rand(180, 520),
    }));
    const topTutors = Array.from({ length: 10 }).map((_, i) => ({
      tutorId: `t${i + 1}`,
      name: `Tutor ${i + 1}`,
      revenue: rand(1500, 9800),
    }));
    const topStudents = Array.from({ length: 10 }).map((_, i) => ({
      studentId: `s${i + 1}`,
      name: `Student ${i + 1}`,
      spend: rand(400, 4200),
    }));
    const avgPriceByCategory = categories.map((c) => ({
      category: c,
      avgPrice: rand(12, 45),
    }));
    const commissionTrend = months.map((m) => ({
      month: m,
      commissionPct: rand(15, 22) / 100,
    }));
    const refundRateTrend = months.map((m) => ({
      month: m,
      rate: rand(1, 6) / 100,
    }));
    const chargebackRateTrend = months.map((m) => ({
      month: m,
      rate: rand(0, 3) / 100,
    }));

    return res.json({
      revenueByCategory,
      revenueByCountry,
      arpuTrend,
      revenuePerTutorTrend,
      topTutors,
      topStudents,
      avgPriceByCategory,
      commissionTrend,
      refundRateTrend,
      chargebackRateTrend,
    });
  }

  return res.json({
    revenueByCategory: [],
    revenueByCountry: [],
    arpuTrend: [],
    revenuePerTutorTrend: [],
    topTutors: [],
    topStudents: [],
    avgPriceByCategory: [],
    commissionTrend: [],
    refundRateTrend: [],
    chargebackRateTrend: [],
  });
});

// ===== Risk & Ops =====
router.get("/riskops", async (req, res) => {
  if (MOCK) {
    const months = lastNMonths(12);

    const refundsTrend = months.map((m) => ({
      month: m,
      count: rand(4, 28),
      amount: rand(120, 1800),
    }));
    const chargebacksTrend = months.map((m) => ({
      month: m,
      count: rand(0, 8),
      amount: rand(0, 1200),
    }));

    const errorTypes = [
      "auth.failed",
      "payment.error",
      "booking.conflict",
      "email.bounce",
    ];
    const errorLogs = Array.from({ length: 45 }).map((_, i) => ({
      at: new Date(Date.now() - rand(0, 14) * 86400000).toISOString(),
      type: errorTypes[rand(0, errorTypes.length - 1)],
      message: `Mock error ${i + 1}`,
      userId: Math.random() < 0.4 ? `u${rand(1, 50)}` : undefined,
    }));

    const flaggedActivities = Array.from({ length: 18 }).map((_, i) => ({
      id: `F${1000 + i}`,
      reason: ["suspicious.refund", "multi-accounts", "card.testing"][rand(0, 2)],
      userId: `u${rand(1, 120)}`,
      at: new Date(Date.now() - rand(1, 20) * 86400000).toISOString(),
    }));

    const disputesTrend = months.map((m) => ({
      month: m,
      opened: rand(2, 18),
      resolved: rand(1, 16),
    }));

    const supportKpis = {
      backlog: rand(4, 42),
      medianResolutionHours: rand(6, 72),
    };

    const supportTrend = months.map((m) => ({
      month: m,
      opened: rand(10, 60),
      closed: rand(8, 58),
    }));

    return res.json({
      refundsTrend,
      chargebacksTrend,
      errorLogs,
      flaggedActivities,
      disputesTrend,
      supportKpis,
      supportTrend,
    });
  }

  return res.json({
    refundsTrend: [],
    chargebacksTrend: [],
    errorLogs: [],
    flaggedActivities: [],
    disputesTrend: [],
    supportKpis: { backlog: 0, medianResolutionHours: 0 },
    supportTrend: [],
  });
});

// -------------------- EXPORT (converted) --------------------
module.exports = router;
