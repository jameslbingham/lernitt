// server/routes/reviews.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Review = require("../models/Review");
const Lesson = require("../models/Lesson");
const mongoose = require("mongoose");

// Helper: can a user review a specific lesson?
async function computeCanReview(userId, lessonId) {
  const lesson = await Lesson.findById(lessonId)
    .select("_id student tutor status endTime")
    .lean();
  if (!lesson) return { canReview: false, reason: "lesson_not_found" };

  if (String(lesson.student) !== String(userId))
    return { canReview: false, reason: "not_student" };

  if (lesson.status !== "completed")
    return { canReview: false, reason: "not_completed" };

  const existing = await Review.findOne({
    lesson: lessonId,
    student: userId,
  }).lean();

  if (existing) return { canReview: false, reason: "already_reviewed" };

  return { canReview: true, reason: "ok", tutor: lesson.tutor };
}

// Helper: can a user review a tutor?
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

router.get("/can/:lessonId", auth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const result = await computeCanReview(req.user.id, lessonId);
    res.json(result);
  } catch (e) {
    console.error("[REVIEWS][can] error", e);
    res.status(500).json({ error: "server_error" });
  }
});

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
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { lessonId, tutorId, rating, text } = req.body || {};
    if (!rating) return res.status(400).json({ error: "missing_fields" });

    let finalLessonId = lessonId;
    let finalTutorId = tutorId;

    if (!finalLessonId && finalTutorId) {
      if (!mongoose.isValidObjectId(finalTutorId)) {
        return res.status(400).json({ error: "invalid_tutor" });
      }

      const can = await computeCanReviewByTutor(req.user.id, finalTutorId);
      if (!can.canReview)
        return res.status(400).json({ error: can.reason || "not_allowed" });

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

    if (finalLessonId && !finalTutorId) {
      const check = await computeCanReview(req.user.id, finalLessonId);
      if (!check.canReview)
        return res.status(400).json({ error: check.reason });
      finalTutorId = check.tutor;
    }

    if (!finalLessonId || !finalTutorId) {
      return res.status(400).json({ error: "missing_identifiers" });
    }

    const review = await Review.create({
      lesson: finalLessonId,
      tutor: finalTutorId,
      student: req.user.id,
      rating: Number(rating),
      text: text || "",
    });

    res.json({ ok: true, review });
  } catch (e) {
    console.error("[REVIEWS][post] error", e);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/mine", auth, async (req, res) => {
  try {
    const items = await Review.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    console.error("[REVIEWS][mine] error", e);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/reviews/tutor/:id
 * Public list of reviews for a tutor.
 * ALWAYS returns 200 with an array.
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

    return res.status(200).json(items || []);
  } catch (e) {
    console.error("[REVIEWS][tutor list] error", e);
    return res.status(200).json([]);
  }
});

router.get("/tutor/:id/summary", async (req, res) => {
  try {
    const agg = await Review.aggregate([
      { $match: { tutor: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: "$tutor",
          average: { $avg: "$rating" },
          reviews: { $count: {} },
        },
      },
    ]);

    if (!agg.length) return res.json({ average: null, reviews: 0 });

    res.json({
      avgRating: agg[0].average,
      count: agg[0].reviews,
      average: agg[0].average,
      reviews: agg[0].reviews,
    });
  } catch (e) {
    console.error("[REVIEWS][summary] error", e);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
