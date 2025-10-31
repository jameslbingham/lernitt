// server/routes/refunds.js
import { Router } from "express";
import Refund from "../models/Refund.js";

const router = Router();

router.get("/", async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const rows = await Refund.find(q).sort({ createdAt: -1 }).lean();
  res.json({ rows });
});

router.post("/:id/approve", async (req, res) => {
  const { id } = req.params;
  const doc = await Refund.findByIdAndUpdate(id, { status: "approved" }, { new: true });
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json({ ok: true, doc });
});

router.post("/:id/deny", async (req, res) => {
  const { id } = req.params;
  const doc = await Refund.findByIdAndUpdate(id, { status: "denied" }, { new: true });
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json({ ok: true, doc });
});

router.post("/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const doc = await Refund.findByIdAndUpdate(id, { status: "cancelled" }, { new: true });
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json({ ok: true, doc });
});

export default router;
