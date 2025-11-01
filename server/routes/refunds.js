// /server/routes/refunds.js
import express from "express";
import mongoose from "mongoose";
import Refund from "../models/Refund.js";

// Optional: Load User model if available (to show names/emails in UI)
let User = null;
try {
  User = (await import("../models/User.js")).default;
} catch (_) {}

const router = express.Router();
router.use(express.json());

// ------------------ Helpers ------------------

// Map raw DB refund.status → UI status
const mapStatus = (s) => {
  if (!s) return "queued";
  const x = String(s).toLowerCase();
  if (x === "open" || x === "pending") return "queued";
  if (x === "processed" || x === "approved") return "approved";
  if (x === "denied" || x === "rejected") return "denied";
  if (x === "canceled" || x === "cancelled") return "cancelled";
  if (x === "failed" || x === "error") return "failed";
  return x;
};

const toStringId = (v) => {
  try {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (v._id) return String(v._id);
    return String(v);
  } catch {
    return "";
  }
};

// Convert studentId/tutorId → {id,name,email}
async function buildParty(refOrId, fallbackLabel = "") {
  const id = toStringId(refOrId);
  const base = { id, name: fallbackLabel || id || "", email: "" };
  if (!User || !mongoose.isValidObjectId(id)) return base;
  try {
    const u = await User.findById(id).select("name email").lean();
    return u ? { id, name: u.name || base.name, email: u.email || "" } : base;
  } catch {
    return base;
  }
}

// Standardise DB doc to UI format BEFORE hydration
function normalizeRefundDoc(doc) {
  const r = doc || {};
  return {
    id: toStringId(r._id),
    lessonId: r.lessonId ? String(r.lessonId) : "",
    amount: Number(r.amount || 0),
    currency: r.currency || "USD",
    status: mapStatus(r.status || "queued"),
    reason: r.reason || "",
    notes: Array.isArray(r.notes) ? r.notes : [],
    createdAt: r.createdAt || new Date().toISOString(),
  };
}

// ------------------ ROUTES ------------------

// GET /api/refunds → { items: [...] }
router.get("/", async (req, res) => {
  try {
    const docs = await Refund.find({}).sort({ createdAt: -1 }).lean();
    const base = docs.map(normalizeRefundDoc);

    const hydrated = await Promise.all(
      base.map(async (item, i) => {
        const raw = docs[i];
        const student = await buildParty(
          raw?.student || raw?.studentId,
          raw?.studentName || raw?.studentId || ""
        );
        const tutor = await buildParty(
          raw?.tutor || raw?.tutorId,
          raw?.tutorName || raw?.tutorId || ""
        );
        return { ...item, student, tutor };
      })
    );

    res.json({ items: hydrated });
  } catch (e) {
    console.error("GET /refunds error:", e);
    res.status(500).json({ error: "refunds_list_failed" });
  }
});

// POST /api/refunds/:id/approve
router.post("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Refund.findByIdAndUpdate(
      id,
      { $set: { status: "approved" } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true, status: "approved", id: String(doc._id) });
  } catch (e) {
    console.error("approve error:", e);
    res.status(500).json({ error: "approve_failed" });
  }
});

// POST /api/refunds/:id/deny   (expects { reason })
router.post("/:id/deny", async (req, res) => {
  try {
    const { id } = req.params;
    const reason =
      (req.body && req.body.reason) ||
      req.header("x-reason") ||
      req.query.reason ||
      "Denied";
    const doc = await Refund.findByIdAndUpdate(
      id,
      { $set: { status: "denied", reason } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true, status: "denied", id: String(doc._id), reason });
  } catch (e) {
    console.error("deny error:", e);
    res.status(500).json({ error: "deny_failed" });
  }
});

// POST /api/refunds/:id/retry
router.post("/:id/retry", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Refund.findByIdAndUpdate(
      id,
      { $set: { status: "queued" }, $unset: { failureReason: 1 } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true, status: "queued", id: String(doc._id) });
  } catch (e) {
    console.error("retry error:", e);
    res.status(500).json({ error: "retry_failed" });
  }
});

// POST /api/refunds/:id/cancel
router.post("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Refund.findByIdAndUpdate(
      id,
      { $set: { status: "cancelled" } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true, status: "cancelled", id: String(doc._id) });
  } catch (e) {
    console.error("cancel error:", e);
    res.status(500).json({ error: "cancel_failed" });
  }
});

// POST /api/refunds/:id/note  (body: {text})
router.post("/:id/note", async (req, res) => {
  try {
    const { id } = req.params;
    const text =
      (req.body && req.body.text) ||
      req.header("x-note-text") ||
      req.query.text ||
      "";
    if (!text) return res.status(400).json({ error: "text_required" });

    const note = { by: "admin", at: new Date().toISOString(), text };
    const doc = await Refund.findByIdAndUpdate(
      id,
      { $push: { notes: note } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true, id: String(doc._id), note });
  } catch (e) {
    console.error("note error:", e);
    res.status(500).json({ error: "note_failed" });
  }
});

export default router;
