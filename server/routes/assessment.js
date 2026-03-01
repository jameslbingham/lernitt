// server/routes/assessment.js
// -----------------------------------------------------------------------------
// Version 5.0.0 - COMPREHENSIVE CEFR DIAGNOSTIC ENGINE
// - MERGED: Calculation logic with Express router structure.
// - ADDED: Full 25-question answer key mapped to custom CEFR categories.
// - FIXED: Grammar Gap Analysis data is now saved to the User profile.
// -----------------------------------------------------------------------------

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini for future advanced Speaking Analysis
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

/**
 * COMPREHENSIVE ANSWER KEY MAPPED TO USER GRAMMAR CATEGORIES
 * This matches the questions provided in the Frontend.
 */
const ANSWER_KEY = {
  // A1 - Beginner
  q1: { correct: "is", level: "A1", comp: "Verb to be" },
  q2: { correct: "Where", level: "A1", comp: "Wh- questions" },
  q3: { correct: "an", level: "A1", comp: "Articles" },
  q4: { correct: "His", level: "A1", comp: "Possessive adjectives" },
  // A2 - Elementary
  q5: { correct: "went", level: "A2", comp: "Past Simple" },
  q6: { correct: "are going to", level: "A2", comp: "Future forms" },
  q7: { correct: "faster", level: "A2", comp: "Comparatives" },
  q8: { correct: "any", level: "A2", comp: "Quantifiers" },
  // B1 - Intermediate
  q9: { correct: "have visited", level: "B1", comp: "Present Perfect" },
  q10: { correct: "will stay", level: "B1", comp: "First Conditional" },
  q11: { correct: "was written", level: "B1", comp: "Passive Voice" },
  q12: { correct: "mustn't", level: "B1", comp: "Modal verbs" },
  // B2 - Upper-Intermediate
  q13: { correct: "had", level: "B2", comp: "Third Conditional" },
  q14: { correct: "had I", level: "B2", comp: "Inversion" },
  q15: { correct: "cut", level: "B2", comp: "Causative forms" },
  q16: { correct: "must", level: "B2", comp: "Advanced Modal meanings" },
  // C1 - Advanced
  q17: { correct: "be", level: "C1", comp: "Subjunctive" },
  q18: { correct: "was he", level: "C1", comp: "Advanced Inversion" },
  q19: { correct: "Having studied", level: "C1", comp: "Participle clauses" },
  q20: { correct: "appears", level: "C1", comp: "Hedging language" },
  // C2 - Proficient
  q21: { correct: "Were", level: "C2", comp: "Fine-grained modal nuance" },
  q22: { correct: "seldom", level: "C2", comp: "Stylistic deviation" },
  q23: { correct: "should", level: "C2", comp: "Creative manipulation" },
  q24: { correct: "might", level: "C2", comp: "Ambiguity management" },
  q25: { correct: "per", level: "C2", comp: "Genre-specific grammar" }
};

/* =============================================================================
   POST /api/assessment/submit
   Calculates CEFR level and identifies specific Grammar Gaps
   ============================================================================= */
router.post('/submit', auth, async (req, res) => {
  try {
    const { answers, speakingBlob } = req.body;

    let missedComponents = [];
    let correctByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    let totalByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };

    // 1. Analyze objective grammar results
    Object.keys(ANSWER_KEY).forEach(qId => {
      const data = ANSWER_KEY[qId];
      totalByLevel[data.level]++;
      if (answers && answers[qId] === data.correct) {
        correctByLevel[data.level]++;
      } else {
        // Track specifically what the student needs to learn
        missedComponents.push({ category: data.level, component: data.comp });
      }
    });

    // 2. CEFR Logic: Move up if score >= 80% (0.8) for the current tier
    let finalLevel = "A1";
    if (correctByLevel.A1 / totalByLevel.A1 >= 0.8) finalLevel = "A2";
    if (finalLevel === "A2" && correctByLevel.A2 / totalByLevel.A2 >= 0.8) finalLevel = "B1";
    if (finalLevel === "B1" && correctByLevel.B1 / totalByLevel.B1 >= 0.8) finalLevel = "B2";
    if (finalLevel === "B2" && correctByLevel.B2 / totalByLevel.B2 >= 0.8) finalLevel = "C1";
    if (finalLevel === "C1" && correctByLevel.C1 / totalByLevel.C1 >= 0.8) finalLevel = "C2";

    // 3. AI Insights (Placeholder for actual Gemini analysis of audio)
    const aiInsights = `Based on your grammar inputs, you have achieved a ${finalLevel} rating. We detected specific gaps in ${missedComponents.length > 0 ? missedComponents[0].component : 'advanced synthesis'}.`;

    // 4. Update User Profile with Gap Analysis
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        proficiencyLevel: finalLevel,
        grammarWeaknesses: missedComponents, // Matches new User Schema
        placementTest: {
          level: finalLevel,
          scores: {
            grammar: Math.round((Object.values(correctByLevel).reduce((a, b) => a + b, 0) / 25) * 100),
            vocabulary: 75, // Sample static value until vocab logic added
            speaking: 80,   // Sample static value
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
      weaknesses: missedComponents.slice(0, 8), // Return top 8 gaps for immediate feedback
      profileName: finalLevel.startsWith('C') ? "Academic Professional" : "Developing Learner"
    });

  } catch (err) {
    console.error("Assessment submission error:", err);
    res.status(500).json({ message: "Failed to process assessment results." });
  }
});

/* =============================================================================
   GET /api/assessment/result
   Retrieves the student's existing test results and weaknesses
   ============================================================================= */
router.get('/result', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('placementTest grammarWeaknesses proficiencyLevel');
    if (!user || !user.placementTest || user.placementTest.level === 'none') {
      return res.status(404).json({ message: "No assessment result found." });
    }
    res.json(user);
  } catch (err) {
    console.error("Fetch assessment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
