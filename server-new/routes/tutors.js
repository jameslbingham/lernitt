// /server/routes/tutors.js
const express = require('express');
const mongoose = require('mongoose');
const Tutor = require('../models/User'); // corrected line

const router = express.Router();

/**
 * GET /api/tutors
 * List tutors with avgRating and reviewsCount
 */
router.get('/', async (req, res) => {
  try {
    const tutors = await Tutor.aggregate([
      {
        $lookup: {
          from: 'reviews',            // Review model -> collection 'reviews'
          localField: '_id',          // Tutor _id
          foreignField: 'tutor',      // Review.tutor
          as: 'reviews'
        }
      },
      {
        $addFields: {
          avgRating: {
            $round: [
              { $ifNull: [{ $avg: '$reviews.rating' }, 0] },
              2
            ]
          },
          reviewsCount: { $size: '$reviews' }
        }
      },
      { $project: { reviews: 0 } }
    ]);

    res.json(tutors);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/**
 * GET /api/tutors/:id
 * Single tutor with avgRating and reviewsCount
 */
router.get('/:id', async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);

    const result = await Tutor.aggregate([
      { $match: { _id: id } },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'tutor',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          avgRating: {
            $round: [
              { $ifNull: [{ $avg: '$reviews.rating' }, 0] },
              2
            ]
          },
          reviewsCount: { $size: '$reviews' }
        }
      },
      { $project: { reviews: 0 } },
      { $limit: 1 }
    ]);

    if (!result.length) return res.status(404).json({ error: 'Tutor not found' });
    res.json(result[0]);
  } catch (err) {
    res.status(400).json({ error: 'Invalid tutor id' });
  }
});

module.exports = router;
