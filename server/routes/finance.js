// /server/routes/finance.js
const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const User = require("../models/User");

let Lesson, Payment, Payout, Refund;
try { Lesson = require("../models/Lesson"); } catch {}
try { Payment = require("../models/Payment"); } catch {}
try { Payout = require("../models/Payout"); } catch {}
try { Refund = require("../models/Refund"); } catch {}

const isMock = process.env.VITE_MOCK === "1";
const COMMISSION_PCT = Number(process.env.PLATFORM_COMMISSION_PCT ?? 0.15); // 15% default

// ----------------------- Admin check (amended) -----------------------
async function isAdmin(req, res, next) {
  try {
    const me = await User.findById(req.user.id).select("isAdmin role");
    if (!me || (!me.isAdmin && me.role !== "admin")) {
      return res.status(403).json({ error: "Admin only" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Auth error" });
  }
}

// =====================================================================
// NEW: TUTOR-SPECIFIC FINANCE ROUTES (ESCROW & EARNED)
// =====================================================================

/**
 * GET /api/finance/tutor-summary
 * Provides Bob with a split view of his money:
 * 1. totalEarned: 85% net of lessons marked 'completed'.
 * 2. packageEscrow: Value of pre-paid credits sitting in student accounts.
 * 3. pendingPayout: Money earned but not yet sent to Bob.
 */
router.get("/tutor-summary", auth, async (req, res) => {
  try {
    const tutorId = req.user.id;

    // 1. Calculate TOTAL EARNED (Released)
    // Only lessons Bob has actually given (status: completed)
    const completedLessons = await Lesson.find({
      tutor: tutorId,
      status: 'completed',
      isTrial: false
    });

    const totalEarned = completedLessons.reduce((acc, l) => {
      const amount = l.price || 0;
      return acc + (amount * (1 - COMMISSION_PCT)); // released after 15% commission
    }, 0);

    // 2. Calculate PACKAGE ESCROW (Unearned)
    // We look for all students who have a packageCredit balance for Bob
    const studentsWithCredits = await User.find({
      "packageCredits.tutorId": tutorId,
      "packageCredits.count": { $gt: 0 }
    });

    let packageEscrow = 0;
    studentsWithCredits.forEach(student => {
      const creditObj = student.packageCredits.find(c => String(c.tutorId) === String(tutorId));
      if (creditObj) {
        // Use Bob's default single lesson price to estimate escrow value
        const bobPrice = req.user.price || 30;
        packageEscrow += (creditObj.count * bobPrice * (1 - COMMISSION_PCT));
      }
    });

    // 3. Calculate REFUNDED
    const refundedLessons = await Lesson.find({
      tutor: tutorId,
      status: 'cancelled',
      cancelReason: 'legal_required_refund'
    });
    const totalRefunded = refundedLessons.reduce((acc, l) => acc + (l.price || 0), 0);

    // 4. Calculate Pending Payout (Earned money not yet sent to Bob's PayPal/Stripe)
    const pendingAgg = await Payout.aggregate([
      { $match: { tutor: tutorId, status: { $in: ["queued", "pending"] } } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } }
    ]);
    const pendingPayout = (pendingAgg[0]?.total || 0) / 100;

    return res.json({
      totalEarned: Math.round(totalEarned * 100) / 100,
      packageEscrow: Math.round(packageEscrow * 100) / 100,
      pendingPayout: Math.round(pendingPayout * 100) / 100,
      refunded: totalRefunded
    });

  } catch (err) {
    console.error('[FINANCE] tutor summary error:', err);
    return res.status(500).json({ error: "Failed to compute tutor earnings" });
  }
});

// -------------------- Existing Admin routes (kept) ----------------------

// --- Approve payout (stub) ---
router.post("/payouts/:id/approve", auth, isAdmin, (req, res) => {
  const { id } = req.params;
  console.log(`[FINANCE] Approve payout ${id}`);
  res.json({ success: true, id, status: "paid" });
});

// --- Deny refund (stub) ---
router.post("/refunds/:id/deny", auth, isAdmin, (req, res) => {
  const { id } = req.params;
  console.log(`[FINANCE] Deny refund ${id}`);
  res.json({ success: true, id, status: "denied" });
});

// ------------------ Finance FX rates (very simple for now) ------------------
router.get("/rates", auth, isAdmin, async (req, res) => {
  try {
    return res.json({
      base: "USD",
      ts: new Date().toISOString(),
      rates: { USD: 1 }, // extend later if you add real FX
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Failed to load FX rates" });
  }
});

// ------------------ Admin Finance Summary route --------------------
/**
 * GET /api/finance/summary
 * Returns a backward-compatible shape for Admin Dashboards
 */
router.get("/summary", auth, isAdmin, async (req, res) => {
  const { from, to, period } = req.query || {};

  // ---- date window
  const now = new Date();
  let start = from ? new Date(from) : null;
  let end = to ? new Date(to) : null;

  if (!start && !end && period && period !== "all") {
    start = new Date(now);
    if (period === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      const day = (now.getDay() + 6) % 7; // Monday start
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    end = now;
  }

  const dateMatch = {};
  if (start) dateMatch.$gte = start;
  if (end) {
    const _end = new Date(end);
    if (_end.getHours() === 0 && _end.getMinutes() === 0 && _end.getSeconds() === 0) {
      _end.setHours(23, 59, 59, 999);
    }
    dateMatch.$lte = _end;
  }
  const createdAtMatch = Object.keys(dateMatch).length ? { createdAt: dateMatch } : {};

  // If mocking or key models unavailable, return a safe empty shape
  if (isMock || !Payment || !Payout || !Refund || !Lesson) {
    return res.json({
      totals: { earnings: 0, payouts: 0, refunds: 0, gmv: 0, revenue: 0, tutorNet: 0 },
      totalsByCurrency: [],
      tutors: [],
      trends: [],
      totalRefunds: 0,
      approvedRefunds: 0,
      deniedRefunds: 0,
      pendingRefunds: 0,
      refundTrends: [],
    });
  }

  try {
    // 1) GMV from successful payments
    const paymentsMatch = { ...createdAtMatch, status: "succeeded" };

    const gmvByCurrency = await Payment.aggregate([
      { $match: paymentsMatch },
      {
        $group: {
          _id: "$currency",
          gmv: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 2) Refunds (approved) by currency
    const refundsMatch = { ...createdAtMatch, status: "approved" };

    const refundAmtByCurrency = await Refund.aggregate([
      { $match: refundsMatch },
      {
        $group: {
          _id: "$currency",
          refunds: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3) Payout totals (paid/succeeded) by currency
    const payoutMatch = {
      ...createdAtMatch,
      status: { $in: ["paid", "succeeded"] },
    };

    const payoutByCurrency = await Payout.aggregate([
      { $match: payoutMatch },
      {
        $group: {
          _id: "$currency",
          payouts: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 4) Merge currency totals
    const currencySet = new Set([
      ...gmvByCurrency.map((x) => String(x._id || "")),
      ...refundAmtByCurrency.map((x) => String(x._id || "")),
      ...payoutByCurrency.map((x) => String(x._id || "")),
    ]);

    const mapGMV = new Map(gmvByCurrency.map((x) => [String(x._id || ""), Number(x.gmv || 0)]));
    const mapRefund = new Map(refundAmtByCurrency.map((x) => [String(x._id || ""), Number(x.refunds || 0)]));
    const mapPayout = new Map(payoutByCurrency.map((x) => [String(x._id || ""), Number(x.payouts || 0)]));

    const totalsByCurrency = Array.from(currencySet)
      .filter(Boolean)
      .sort()
      .map((currency) => {
        const gmv = mapGMV.get(currency) || 0;
        const refunds = mapRefund.get(currency) || 0;
        const netGMV = Math.max(0, gmv - refunds);
        const revenue = Math.round(netGMV * COMMISSION_PCT * 100) / 100;
        const tutorNet = Math.round((netGMV - revenue) * 100) / 100;
        const payouts = mapPayout.get(currency) || 0;

        return { currency, gmv: netGMV, revenue, tutorNet, refunds, payouts };
      });

    const totals = totalsByCurrency.reduce(
      (acc, row) => {
        acc.gmv += row.gmv;
        acc.revenue += row.revenue;
        acc.tutorNet += row.tutorNet;
        acc.refunds += row.refunds;
        acc.payouts += row.payouts;
        return acc;
      },
      { gmv: 0, revenue: 0, tutorNet: 0, refunds: 0, payouts: 0 }
    );

    const totalsOut = {
      earnings: totals.revenue,
      payouts: totals.payouts,
      refunds: totals.refunds,
      gmv: totals.gmv,
      revenue: totals.revenue,
      tutorNet: totals.tutorNet,
    };

    // 5) Tutor leaderboard from payments (join lesson -> tutor)
    const tutorRows = await Payment.aggregate([
      { $match: paymentsMatch },
      {
        $lookup: {
          from: "lessons",
          localField: "lesson",
          foreignField: "_id",
          as: "lessonDoc",
        },
      },
      { $unwind: "$lessonDoc" },
      {
        $group: {
          _id: { tutor: "$lessonDoc.tutor", currency: "$currency" },
          gmv: { $sum: "$amount" },
          lessons: { $sum: 1 },
        },
      },
      { $sort: { gmv: -1 } },
      { $limit: 50 },
    ]);

    const tutors = [];
    for (const r of tutorRows) {
      const tutorId = r?._id?.tutor;
      const currency = String(r?._id?.currency || "");
      let name = tutorId ? String(tutorId) : "Unknown";

      if (tutorId) {
        const u = await User.findById(tutorId).select("name firstName lastName email");
        if (u) {
          name = u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || String(u._id);
        }
      }

      const gmv = Number(r.gmv || 0);
      const revenue = Math.round(gmv * COMMISSION_PCT * 100) / 100;
      const tutorNet = Math.round((gmv - revenue) * 100) / 100;

      tutors.push({
        id: String(tutorId || "unknown"),
        name,
        earnings: tutorNet, 
        lessons: Number(r.lessons || 0),
        currency,
      });
    }

    // 6) Monthly trends (GMV/revenue/tutorNet)
    const trends = await Payment.aggregate([
      { $match: paymentsMatch },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            c: "$currency",
          },
          gmv: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.c": 1 } },
    ]).then((rows) =>
      rows.map((r) => {
        const month = `${r._id.y}-${String(r._id.m).padStart(2, "0")}`;
        const currency = String(r._id.c || "");
        const gmv = Number(r.gmv || 0);
        const revenue = Math.round(gmv * COMMISSION_PCT * 100) / 100;
        const tutorNet = Math.round((gmv - revenue) * 100) / 100;
        return {
          month,
          currency,
          earnings: revenue,
          gmv,
          revenue,
          tutorNet,
        };
      })
    );

    // 7) Refund counts + daily trends
    const refundCountMatch = { ...createdAtMatch };

    const since30 = new Date();
    since30.setDate(since30.getDate() - 29);

    const trendMatch = Object.keys(createdAtMatch).length
      ? refundCountMatch
      : { createdAt: { $gte: since30 } };

    const [approvedAgg] = await Refund.aggregate([
      { $match: { ...refundCountMatch, status: "approved" } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const [deniedAgg] = await Refund.aggregate([
      { $match: { ...refundCountMatch, status: "denied" } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const [pendingAgg] = await Refund.aggregate([
      { $match: { ...refundCountMatch, status: { $in: ["queued", "pending"] } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const [countAgg] = await Refund.aggregate([
      { $match: { ...refundCountMatch } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);

    const refundTrends = await Refund.aggregate([
      { $match: { ...trendMatch, status: "approved" } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
            c: "$currency",
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1, "_id.c": 1 } },
    ]).then((rows) =>
      rows.map((r) => ({
        date: `${r._id.y}-${String(r._id.m).padStart(2, "0")}-${String(r._id.d).padStart(2, "0")}`,
        currency: String(r._id.c || ""),
        amount: Number(r.amount || 0),
      }))
    );

    return res.json({
      totals: totalsOut,
      totalsByCurrency,
      tutors,
      trends,
      totalRefunds: Number(countAgg?.total || 0),
      approvedRefunds: Number(approvedAgg?.total || 0),
      deniedRefunds: Number(deniedAgg?.total || 0),
      pendingRefunds: Number(pendingAgg?.total || 0),
      refundTrends,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Failed to compute finance summary" });
  }
});

module.exports = router;
