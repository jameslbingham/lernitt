// server/routes/payouts.js
import { Router } from "express";
import Payout from "../models/Payout.js";

const router = Router();

// List payouts (newest first, optional status filter)
router.get("/", async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const rows = await Payout.find(q).sort({ createdAt: -1 }).lean();
  res.json({ rows });
});

// Totals by status and currency
router.get("/totals", async (_req, res) => {
  const byStatus = await Payout.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
  ]);
  const byCurrency = await Payout.aggregate([
    { $group: { _id: "$currency", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
  ]);
  res.json({ byStatus, byCurrency });
});

// Mark one paid
router.post("/:id/mark-paid", async (req, res) => {
  const { id } = req.params;
  const doc = await Payout.findByIdAndUpdate(id, { status: "paid" }, { new: true });
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json({ ok: true, doc });
});

// Retry failed → pending
router.post("/:id/retry", async (req, res) => {
  const { id } = req.params;
  const doc = await Payout.findByIdAndUpdate(id, { status: "pending" }, { new: true });
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json({ ok: true, doc });
});

export default router;
