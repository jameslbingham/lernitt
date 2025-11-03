// /server/routes/finance.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Optional models for live summary aggregation (wrapped in try/catch)
let Payout, Refund, Lesson;
try { Payout = require("../models/Payout"); } catch {}
try { Refund = require("../models/Refund"); } catch {}
try { Lesson = require("../models/Lesson"); } catch {}

const isMock = process.env.VITE_MOCK === "1";

// ----------------------- Admin check (kept) -----------------------
async function isAdmin(req, res, next) {
  try {
    const me = await User.findById(req.user.id).select("isAdmin");
    if (!me || !me.isAdmin) return res.status(403).json({ error: "Admin only" });
    next();
  } catch {
    return res.status(401).json({ error: "Auth error" });
  }
}

// -------------------- Existing routes (kept) ----------------------

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

// ------------------ NEW: Finance Summary route --------------------
/**
 * GET /api/finance/summary
 * Optional query:
 *   - from: ISO date (inclusive)
 *   - to:   ISO date (inclusive)
 *   - period: "today" | "week" | "month" | "all"  (used only if from/to not provided)
 *
 * Response:
 * {
 *   totals: { earnings, payouts, refunds },
 *   tutors: [{ id, name, earnings, lessons }],
 *   trends: [{ month: "YYYY-MM", earnings }],
 *   totalRefunds,
 *   approvedRefunds,
 *   deniedRefunds,
 *   pendingRefunds,
 *   refundTrends: [{ date: "YYYY-MM-DD", amount }]
 * }
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

  // If mocking or models unavailable, return a safe empty shape (no randoms)
  if (isMock || !Payout || !Refund) {
    return res.json({
      totals: { earnings: 0, payouts: 0, refunds: 0 },
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
    // ---------- Totals ----------
    // NOTE: adjust "$amount" if your schema uses "amountCents" etc.
    const [payoutAgg] = await Payout.aggregate([
      { $match: { ...createdAtMatch } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const [refundAgg] = await Refund.aggregate([
      { $match: { ...createdAtMatch } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalPayouts = Number(payoutAgg?.total || 0);
    const totalRefunds = Number(refundAgg?.total || 0);
    const totals = {
      earnings: totalPayouts, // adapt if you define "earnings" differently
      payouts: totalPayouts,
      refunds: totalRefunds,
    };

    // ---------- Tutor leaderboard ----------
    const tutorPayouts = await Payout.aggregate([
      { $match: { ...createdAtMatch } },
      { $group: { _id: "$tutor", earnings: { $sum: "$amount" }, lessons: { $sum: 1 } } },
      { $sort: { earnings: -1 } },
      { $limit: 20 },
    ]);

    const tutors = [];
    for (const tp of tutorPayouts) {
      let name = String(tp._id || "Unknown");
      if (User && tp._id) {
        const u = await User.findById(tp._id).select("name firstName lastName email");
        if (u) {
          name = u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || String(u._id);
        }
      }
      tutors.push({
        id: String(tp._id || "unknown"),
        name,
        earnings: Number(tp.earnings || 0),
        lessons: Number(tp.lessons || 0),
      });
    }

    // ---------- Monthly trends (earnings from payouts) ----------
    const trends = await Payout.aggregate([
      { $match: { ...createdAtMatch } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          earnings: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]).then((rows) =>
      rows.map((r) => ({
        month: `${r._id.y}-${String(r._id.m).padStart(2, "0")}`,
        earnings: Number(r.earnings || 0),
      }))
    );

    // ---------- Refund metrics + daily refund trend ----------
    const refundMatch = { ...createdAtMatch };
    const since30 = new Date();
    since30.setDate(since30.getDate() - 29);

    const trendMatch = Object.keys(createdAtMatch).length
      ? refundMatch
      : { createdAt: { $gte: since30 } };

    const [approvedAgg] = await Refund.aggregate([
      { $match: { ...refundMatch, status: "approved" } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const [deniedAgg] = await Refund.aggregate([
      { $match: { ...refundMatch, status: "denied" } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const [pendingAgg] = await Refund.aggregate([
      { $match: { ...refundMatch, status: { $in: ["queued", "pending"] } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const [countAgg] = await Refund.aggregate([
      { $match: { ...refundMatch } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);

    const refundTrends = await Refund.aggregate([
      { $match: { ...trendMatch } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]).then((rows) =>
      rows.map((r) => ({
        date: `${r._id.y}-${String(r._id.m).padStart(2, "0")}-${String(r._id.d).padStart(2, "0")}`,
        amount: Number(r.amount || 0),
      }))
    );

    return res.json({
      totals,
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
