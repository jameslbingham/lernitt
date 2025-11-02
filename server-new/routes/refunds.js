// /server/routes/refunds.js
const express = require("express");
const router = express.Router();

const isMock = process.env.VITE_MOCK === "1";

// ----------------------- helpers (kept) -----------------------
function getUserId(req) {
  // If you later add auth middleware, prefer req.user.id
  return (req.user && (req.user.id || req.user._id)) || "admin-mock";
}

// ----------------- very simple in-memory mock -----------------
// Used when VITE_MOCK=1 (your current behavior)
const mockRefunds = new Map(); // id -> refund record

function ensureRefund(id) {
  if (!mockRefunds.has(id)) {
    mockRefunds.set(id, {
      id,
      status: "pending", // pending|queued|approved|denied|failed|cancelled
      amount: 0,
      currency: "USD",
      lessonId: null,
      studentId: null,
      tutorId: null,
      student: null,
      tutor: null,
      notes: [],
      history: [],
      reason: null,
      failureReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return mockRefunds.get(id);
}

function filterMockList({ status, tutor, student, currency, from, to, q }) {
  let arr = Array.from(mockRefunds.values());
  if (status) arr = arr.filter((r) => (r.status || "") === status);
  if (currency) arr = arr.filter((r) => (r.currency || "") === currency);
  if (tutor) {
    const needle = String(tutor).toLowerCase();
    arr = arr.filter(
      (r) =>
        (r.tutorId && String(r.tutorId) === tutor) ||
        (r.tutor?.id && String(r.tutor.id) === tutor) ||
        (r.tutor?.name || "").toLowerCase() === needle
    );
  }
  if (student) {
    const needle = String(student).toLowerCase();
    arr = arr.filter(
      (r) =>
        (r.studentId && String(r.studentId) === student) ||
        (r.student?.id && String(r.student.id) === student) ||
        (r.student?.name || "").toLowerCase() === needle
    );
  }
  if (from) arr = arr.filter((r) => new Date(r.createdAt) >= new Date(from));
  if (to) arr = arr.filter((r) => new Date(r.createdAt) <= new Date(to));
  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase();
    arr = arr.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }
  arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return arr;
}

/* ============================ LIST (live + mock) ============================ */
let RefundModel;
try {
  RefundModel = require("../models/Refund");
} catch {}

router.get("/", async (req, res) => {
  const { status, currency, tutor, student, q } = req.query || {};

  // ------- MOCK MODE -------
  if (isMock || !RefundModel) {
    const items = filterMockList({ status, tutor, student, currency, q });
    return res.json({ items });
  }

  // ------- LIVE MODE -------
  try {
    const match = {};
    if (status) match.status = status;
    if (currency) match.currency = currency;
    if (tutor) match.tutor = tutor;
    if (student) match.student = student;
    if (q && String(q).trim() !== "") {
      const rx = new RegExp(String(q).trim(), "i");
      match.$or = [{ reason: rx }, { failureReason: rx }];
    }

    const docs = await RefundModel.find(match)
      .sort({ createdAt: -1 })
      .populate("student", "name email")
      .populate("tutor", "name email")
      .populate("lesson", "_id")
      .lean();

    const items = docs.map((d) => ({
      id: String(d._id),
      lessonId: d.lesson ? String(d.lesson._id || d.lesson) : undefined,
      student: d.student
        ? { id: String(d.student._id), name: d.student.name, email: d.student.email }
        : undefined,
      tutor: d.tutor
        ? { id: String(d.tutor._id), name: d.tutor.name, email: d.tutor.email }
        : undefined,
      amount: Number(d.amount || 0),
      currency: d.currency || "USD",
      reason: d.reason || "",
      status: d.status || "pending",
      failureReason: d.failureReason,
      notes: (d.notes || []).map((n) => ({
        by: n.by,
        at: n.at,
        text: n.text,
      })),
      createdAt: d.createdAt,
    }));

    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to list refunds" });
  }
});

/* ============================ APPROVE ============================ */
router.post("/:id/approve", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  if (!isMock) return res.status(501).json({ error: "Not implemented in live mode yet." });

  const refund = ensureRefund(id);
  if (refund.status === "approved") return res.json({ ok: true, refund });

  refund.status = "approved";
  refund.reason = reason || "Approved";
  refund.approvedAt = new Date().toISOString();
  refund.approvedBy = getUserId(req);
  refund.updatedAt = refund.approvedAt;
  refund.history.push({
    at: refund.approvedAt,
    by: refund.approvedBy,
    action: "approve",
    reason: refund.reason,
  });

  return res.json({ ok: true, refund });
});

/* ============================ DENY ============================ */
router.post("/:id/deny", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  if (!isMock) return res.status(501).json({ error: "Not implemented in live mode yet." });
  if (!reason || String(reason).trim() === "")
    return res.status(400).json({ error: "Reason required" });

  const refund = ensureRefund(id);
  if (refund.status === "denied") return res.json({ ok: true, refund });

  refund.status = "denied";
  refund.reason = reason;
  refund.deniedAt = new Date().toISOString();
  refund.deniedBy = getUserId(req);
  refund.updatedAt = refund.deniedAt;
  refund.history.push({
    at: refund.deniedAt,
    by: refund.deniedBy,
    action: "deny",
    reason,
  });

  return res.json({ ok: true, refund });
});

/* ============================= RETRY ============================= */
router.post("/:id/retry", (req, res) => {
  const { id } = req.params;
  if (!isMock) return res.status(501).json({ error: "Not implemented in live mode yet." });

  const refund = ensureRefund(id);
  refund.status = "queued";
  refund.failureReason = null;
  refund.retriedAt = new Date().toISOString();
  refund.retriedBy = getUserId(req);
  refund.updatedAt = refund.retriedAt;
  refund.history.push({
    at: refund.retriedAt,
    by: refund.retriedBy,
    action: "retry",
  });
  return res.json({ ok: true, refund });
});

/* ============================= CANCEL ============================ */
router.post("/:id/cancel", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  if (!isMock) return res.status(501).json({ error: "Not implemented in live mode yet." });

  const refund = ensureRefund(id);
  if (refund.status === "cancelled") return res.json({ ok: true, refund });

  refund.status = "cancelled";
  if (reason) refund.reason = reason;
  refund.cancelledAt = new Date().toISOString();
  refund.cancelledBy = getUserId(req);
  refund.updatedAt = refund.cancelledAt;
  refund.history.push({
    at: refund.cancelledAt,
    by: refund.cancelledBy,
    action: "cancel",
    reason: refund.reason || null,
  });
  return res.json({ ok: true, refund });
});

/* =============================== NOTE ============================= */
router.post("/:id/note", (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};

  if (!isMock) return res.status(501).json({ error: "Not implemented in live mode yet." });
  const t = String(text || "").trim();
  if (!t) return res.status(400).json({ error: "Note text is required." });

  const refund = ensureRefund(id);
  const note = { by: getUserId(req), at: new Date().toISOString(), text: t };
  if (!Array.isArray(refund.notes)) refund.notes = [];
  refund.notes.push(note);
  refund.updatedAt = note.at;
  refund.history.push({ at: note.at, by: note.by, action: "note", text: t });
  return res.json({ ok: true, note, refundId: id });
});

/* ============================= UPDATE (new) ============================= */
router.patch("/:id/update", async (req, res) => {
  const { id } = req.params;
  const { amount, currency, reason } = req.body || {};

  if (!isMock && RefundModel) {
    try {
      const doc = await RefundModel.findById(id);
      if (!doc) return res.status(404).json({ error: "Refund not found" });

      if (amount !== undefined) doc.amount = amount;
      if (currency !== undefined) doc.currency = currency;
      if (reason !== undefined) doc.reason = reason;

      doc.history.push({
        at: new Date(),
        by: getUserId(req),
        action: "update",
        reason: "Manual edit",
      });
      await doc.save();
      return res.json({ ok: true, refund: doc });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const refund = ensureRefund(id);
  if (amount) refund.amount = amount;
  if (currency) refund.currency = currency;
  if (reason) refund.reason = reason;
  refund.updatedAt = new Date().toISOString();
  refund.history.push({
    at: refund.updatedAt,
    by: getUserId(req),
    action: "update",
  });
  return res.json({ ok: true, refund });
});

/* ============================ STATS (new) ============================ */
router.get("/stats", async (req, res) => {
  if (isMock || !RefundModel) {
    const all = Array.from(mockRefunds.values());
    const total = all.length;
    const count = (s) => all.filter((r) => r.status === s).length;
    return res.json({
      total,
      approved: count("approved"),
      denied: count("denied"),
      pending: count("pending"),
      failed: count("failed"),
    });
  }

  try {
    const agg = await RefundModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const result = { total: 0, approved: 0, denied: 0, pending: 0, failed: 0 };
    for (const r of agg || []) {
      result.total += r.count;
      if (r._id in result) result[r._id] = r.count;
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to compute refund stats" });
  }
});

/* ============================ DELETE (new) ============================ */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (isMock || !RefundModel) {
    mockRefunds.delete(id);
    return res.json({ ok: true, deletedId: id });
  }

  try {
    const result = await RefundModel.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ error: "Refund not found" });
    return res.json({ ok: true, deletedId: id });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to delete refund" });
  }
});

/* ============================ GET ONE ============================ */
router.get("/:id", (req, res) => {
  if (!isMock) return res.status(501).json({ error: "Not implemented in live mode yet." });
  const { id } = req.params;
  const refund = ensureRefund(id);
  return res.json({ ok: true, refund });
});

module.exports = router;
