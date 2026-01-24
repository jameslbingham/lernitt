// server/routes/assessment.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini for Speaking Analysis
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

/* =============================================================================
   POST /api/assessment/submit
   Calculates scores and saves CEFR result to User profile
   ============================================================================= */
router.post('/submit', auth, async (req, res) => {
  try {
    const { grammarAnswers, vocabAnswers, speakingBlob } = req.body;

    // 1. Calculate base objective scores (Grammar/Vocab)
    // In a production app, you'd compare these against a correct_answers key
    const grammarScore = 85; // Mocked calculation logic
    const vocabScore = 78;    // Mocked calculation logic

    // 2. Perform AI Speaking Analysis (Linguistic DNA)
    // For this mockup, we simulate a prompt to Gemini 2.0
    const aiInsights = `Your speaking shows a strong command of complex structures, though some hesitation exists in spontaneous output. We recommend focusing on "Third Conditional" nuances to bridge the gap to C1.`;
    
    const finalLevel = "B2"; // Logic would derive this from scores

    // 3. Update the User record in the database
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        proficiencyLevel: finalLevel,
        placementTest: {
          level: finalLevel,
          scores: {
            grammar: grammarScore,
            vocabulary: vocabScore,
            speaking: 82, // AI derived speaking score
          },
          insights: aiInsights,
          completedAt: new Date()
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      level: finalLevel,
      summary: updatedUser.summary()
    });

  } catch (err) {
    console.error("Assessment submission error:", err);
    res.status(500).json({ message: "Failed to process assessment results." });
  }
});

/* =============================================================================
   GET /api/assessment/result
   Retrieves the student's existing test results
   ============================================================================= */
router.get('/result', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('placementTest');
    if (!user || !user.placementTest || user.placementTest.level === 'none') {
      return res.status(404).json({ message: "No assessment result found." });
    }
    res.json(user.placementTest);
  } catch (err) {
    console.error("Fetch assessment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
