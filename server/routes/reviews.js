// /server/routes/reviews.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Review = require("../models/Review");
const Lesson = require("../models/Lesson");
const mongoose = require("mongoose");

// ---------------- Helper: can a user review a specific lesson? ----------------
async function computeCanReview(userId, lessonId) {
  if (!mongoose.isValidObjectId(lessonId)) {
    return { canReview: false, reason: "invalid_lesson" };
  }

  const lesson = await Lesson.findById(lessonId)
    .select("_id student tutor status endTime")
    .lean();

  if (!lesson) return { canReview: false, reason: "lesson_not_found" };

  if (String(lesson.student) !== String(userId)) {
    return { canReview: false, reason: "not_student" };
  }

  if (lesson.status !== "completed") {
    return { canReview: false, reason: "not_completed" };
  }

  const existing = await Review.findOne({
    lesson: lessonId,
    student: userId,
  }).lean();

  if (existing) return { canReview: false, reason: "already_reviewed" };

  return { canReview: true, reason: "ok", tutor: lesson.tutor };
}

// -------- Helper: can a user review a tutor (completed lesson exists + not yet reviewed) --------
async function computeCanReviewByTutor(userId, tutorId) {
  if (!mongoose.isValidObjectId(tutorId)) {
    return { canReview: false, reason: "invalid_tutor" };
  }

  const alreadyReviewed = await Review.exists({
    student: userId,
    tutor: tutorId,
  });

  if (alreadyReviewed) {
    return { canReview: false, reason: "already_reviewed" };
  }

  const hasCompletedLesson = await Lesson.exists({
    student: userId,
    tutor: tutorId,
    status: "completed",
  });

  if (!hasCompletedLesson) {
    return { canReview: false, reason: "no_completed_lesson" };
  }

  return { canReview: true, reason: "ok" };
}

/**
 * GET /api/reviews/can/:lessonId
 * Check if the logged-in student may review this lesson.
 */
router.get("/can/:lessonId", auth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const result = await computeCanReview(req.user.id, lessonId);
    return res.json(result);
  } catch (e) {
    console.error("[REVIEWS][can] error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/reviews/can-review?tutorId=...
 * Returns: { canReview: boolean }
 */
router.get("/can-review", auth, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id);
    const { tutorId } = req.query || {};
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    if (!tutorId) return res.status(400).json({ error: "missing_tutorId" });

    const result = await computeCanReviewByTutor(userId, tutorId);
    return res.json({ canReview: !!result.canReview });
  } catch (e) {
    console.error("[REVIEWS][can-review] error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/reviews
 * Body:
 *  - Option A: { lessonId, rating (1-5), text }
 *  - Option B: { tutorId, rating (1-5), text }  // server picks eligible lesson
 */
router.post("/", auth, async (req, res) => {
  try {
    const { lessonId, tutorId, rating, text } = req.body || {};

    const r = Number(rating);
    if (!r || r < 1 || r > 5) {
      return res.status(400).json({ error: "invalid_rating" });
    }

    let finalLessonId = lessonId;
    let finalTutorId = tutorId;

    // If tutorId provided (no lessonId), pick the most recent completed lesson
    if (!finalLessonId && finalTutorId) {
      const can = await computeCanReviewByTutor(req.user.id, finalTutorId);
      if (!can.canReview) {
        return res.status(400).json({ error: can.reason || "not_allowed" });
      }

      const latestCompleted = await Lesson.findOne({
        student: req.user.id,
        tutor: finalTutorId,
        status: "completed",
      })
        .sort({ endTime: -1 })
        .select("_id tutor")
        .lean();

      if (!latestCompleted) {
        return res.status(400).json({ error: "no_completed_lesson" });
      }

      const already = await Review.exists({
        lesson: latestCompleted._id,
        student: req.user.id,
      });
      if (already) {
        return res.status(400).json({ error: "already_reviewed" });
      }

      finalLessonId = latestCompleted._id;
      finalTutorId = latestCompleted.tutor;
    }

    // If lessonId provided (and tutorId missing), validate and infer tutorId
    if (finalLessonId && !finalTutorId) {
      const check = await computeCanReview(req.user.id, finalLessonId);
      if (!check.canReview) {
        return res.status(400).json({ error: check.reason || "not_allowed" });
      }
      finalTutorId = check.tutor;
    }

    if (!finalLessonId || !finalTutorId) {
      return res.status(400).json({ error: "missing_identifiers" });
    }

    const review = await Review.create({
      lesson: finalLessonId,
      tutor: finalTutorId,
      student: req.user.id,
      rating: r,
      text: text || "",
    });

    return res.json({ ok: true, review });
  } catch (e) {
    console.error("[REVIEWS][post] error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/reviews/mine
 * List the current student's reviews.
 */
router.get("/mine", auth, async (req, res) => {
  try {
    const items = await Review.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(items);
  } catch (e) {
    console.error("[REVIEWS][mine] error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/reviews/tutor/:id
 * Public list of reviews for a tutor.
 * ALWAYS returns 200 with an array (even if none).
 */
router.get("/tutor/:id", async (req, res) => {
  try {
    const tutorId = req.params.id;

    if (!mongoose.isValidObjectId(tutorId)) {
      return res.status(200).json([]);
    }

    const items = await Review.find({ tutor: tutorId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(Array.isArray(items) ? items : []);
  } catch (e) {
    console.error("[REVIEWS][tutor list] error", e);
    return res.status(200).json([]);
  }
});

/**
 * GET /api/reviews/tutor/:id/summary
 * Always returns 200 with safe defaults.
 */
router.get("/tutor/:id/summary", async (req, res) => {
  try {
    const tutorId = req.params.id;

    if (!mongoose.isValidObjectId(tutorId)) {
      return res.status(200).json({
        avgRating: null,
        reviewsCount: 0,
        average: null,
        reviews: 0,
      });
    }

    const agg = await Review.aggregate([
      { $match: { tutor: new mongoose.Types.ObjectId(tutorId) } },
      {
        $group: {
          _id: "$tutor",
          average: { $avg: "$rating" },
          reviews: { $count: {} },
        },
      },
    ]);

    if (!agg.length) {
      return res.status(200).json({
        avgRating: null,
        reviewsCount: 0,
        average: null,
        reviews: 0,
      });
    }

    return res.status(200).json({
      avgRating: agg[0].average,
      reviewsCount: agg[0].reviews,
      average: agg[0].average,
      reviews: agg[0].reviews,
    });
  } catch (e) {
    console.error("[REVIEWS][summary] error", e);
    return res.status(200).json({
      avgRating: null,
      reviewsCount: 0,
      average: null,
      reviews: 0,
    });
  }
});

module.exports = router;
