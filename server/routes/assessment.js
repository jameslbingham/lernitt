// server/routes/assessment.js
// -----------------------------------------------------------------------------
// Version 6.0.0 - FULL SYLLABUS INTEGRATION & GAP AUDIT
// - MAPPED: 100% of the User's A1-C2 Grammatical Categories (80+ items).
// - MERGED: Professional Express routing with the new Comprehensive Syllabus Brain.
// - LOGIC: Identifies specific test misses AND maps all future requirements.
// -----------------------------------------------------------------------------

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini for future advanced Speaking Analysis
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

/**
 * THE MASTER LERNITT SYLLABUS
 * This is the heart of your integrated teaching system. 
 * Every category here corresponds to your planned worksheets.
 */
const MASTER_SYLLABUS = {
  A1: [
    "Subject pronouns", "Verb to be", "Verb have / have got", "Present Simple (Affirmative)",
    "Yes / No questions", "Wh- questions", "Articles: a / an / the", "Singular & plural nouns",
    "Possessive adjectives", "Demonstratives", "There is / there are", "Basic prepositions",
    "Adjectives (Basic order)", "Imperatives", "Basic conjunctions", "Numbers, dates, time"
  ],
  A2: [
    "Present Simple (Full)", "Present Continuous", "Past Simple", "Used to (Basic)",
    "Future: going to", "Future: will", "Countable / uncountable nouns", "Quantifiers",
    "Comparative adjectives", "Superlatives", "Object pronouns", "Adverbs of frequency",
    "Prepositions (Expanded)", "Simple modals: can / must", "Simple connectors (because, so)"
  ],
  B1: [
    "Present Perfect", "Present Perfect vs Past Simple", "Past Continuous", "Future Continuous",
    "First Conditional", "Zero Conditional", "Modal verbs: obligation", "Modal verbs: advice",
    "Modal verbs: possibility", "Gerund vs infinitive", "Relative clauses", "Passive voice (Basic)",
    "Reported speech (Statements)", "Advanced Comparatives", "Adverbial clauses", 
    "Word order (Questions/Negatives)", "Linking words (however, although)"
  ],
  B2: [
    "Full tense system control", "Present Perfect Continuous", "Past Perfect", 
    "Past Perfect Continuous", "Future Perfect", "Second Conditional", "Third Conditional",
    "Mixed conditionals", "Advanced modals: deduction", "Advanced modals: nuances",
    "Passive voice (Advanced)", "Reported speech (Questions/Commands)", "Reduced relative clauses",
    "Causative forms", "Inversion", "Discourse markers", "Complex noun phrases", "Formal vs informal choices"
  ],
  C1: [
    "Full mastery of verb aspects", "Subjunctive structures", "Advanced inversion", "Ellipsis",
    "Advanced cleft sentences", "Complex participle clauses", "Advanced conditionals",
    "Hedging language", "Nominalisation", "Advanced reported speech", "Register control",
    "Embedded questions", "Advanced linking & cohesion"
  ],
  C2: [
    "Grammatical flexibility", "Native-like tense switching", "Complex metaphorical structures",
    "Idiomatic grammatical patterns", "Advanced pragmatic grammar", "Stylistic deviation",
    "Highly compressed structures", "Literary and rhetorical grammar", "Genre-specific grammar",
    "Ambiguity management", "Natural use of understatement & irony", "Fine-grained modal nuance",
    "Creative manipulation of syntax"
  ]
};

/**
 * THE DIAGNOSTIC MAPPING (25 Key Checkpoints)
 * These questions act as the "scouts" to find the student's level.
 */
const ANSWER_KEY = {
  q1: { correct: "is", level: "A1", comp: "Verb to be" },
  q2: { correct: "Where", level: "A1", comp: "Wh- questions" },
  q3: { correct: "an", level: "A1", comp: "Articles: a / an / the" },
  q4: { correct: "His", level: "A1", comp: "Possessive adjectives" },
  q5: { correct: "went", level: "A2", comp: "Past Simple" },
  q6: { correct: "are going to", level: "A2", comp: "Future: going to" },
  q7: { correct: "faster", level: "A2", comp: "Comparative adjectives" },
  q8: { correct: "any", level: "A2", comp: "Quantifiers" },
  q9: { correct: "have visited", level: "B1", comp: "Present Perfect" },
  q10: { correct: "will stay", level: "B1", comp: "First Conditional" },
  q11: { correct: "was written", level: "B1", comp: "Passive voice (Basic)" },
  q12: { correct: "mustn't", level: "B1", comp: "Modal verbs: obligation" },
  q13: { correct: "had", level: "B2", comp: "Third Conditional" },
  q14: { correct: "had I", level: "B2", comp: "Inversion" },
  q15: { correct: "cut", level: "B2", comp: "Causative forms" },
  q16: { correct: "must", level: "B2", comp: "Advanced modals: deduction" },
  q17: { correct: "be", level: "C1", comp: "Subjunctive structures" },
  q18: { correct: "was he", level: "C1", comp: "Advanced inversion" },
  q19: { correct: "Having studied", level: "C1", comp: "Complex participle clauses" },
  q20: { correct: "appears", level: "C1", comp: "Hedging language" },
  q21: { correct: "Were", level: "C2", comp: "Fine-grained modal nuance" },
  q22: { correct: "seldom", level: "C2", comp: "Stylistic deviation" },
  q23: { correct: "should", level: "C2", comp: "Creative manipulation of syntax" },
  q24: { correct: "might", level: "C2", comp: "Ambiguity management" },
  q25: { correct: "per", level: "C2", comp: "Genre-specific grammar" }
};

/* =============================================================================
   POST /api/assessment/submit
   Calculates CEFR level and maps the student against the FULL Master Syllabus
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
        missedComponents.push({ category: data.level, component: data.comp });
      }
    });

    // 2. CEFR Logic: Determine current tier (Threshold >= 80%)
    let finalLevel = "A1";
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    for (let i = 0; i < levels.length; i++) {
      let lvl = levels[i];
      if ((correctByLevel[lvl] / totalByLevel[lvl]) >= 0.8) {
        finalLevel = lvl;
      } else {
        break; 
      }
    }

    // 3. GENERATE FULL ACADEMIC ROADMAP
    // We add specifically missed items from the current level AND 100% of items from all higher levels.
    let fullRoadmap = [];
    levels.forEach(lvl => {
      if (lvl === finalLevel) {
        // Add specific gaps found in current level
        const currentGaps = missedComponents.filter(m => m.category === lvl);
        fullRoadmap.push(...currentGaps);
      } else if (levels.indexOf(lvl) > levels.indexOf(finalLevel)) {
        // Add every category from higher levels as future roadmap items
        const futureSyllabus = MASTER_SYLLABUS[lvl].map(item => ({
          category: lvl,
          component: item
        }));
        fullRoadmap.push(...futureSyllabus);
      }
    });

    const aiInsights = `Placement complete. You are currently at the ${finalLevel} tier. To reach the next level, we have mapped ${fullRoadmap.length} syllabus components for you to master.`;

    // 4. Update the User profile with the Permanent Roadmap
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        proficiencyLevel: finalLevel,
        grammarWeaknesses: fullRoadmap, // The full checklist for tutors
        placementTest: {
          level: finalLevel,
          scores: {
            grammar: Math.round((Object.values(correctByLevel).reduce((a, b) => a + b, 0) / 25) * 100),
            vocabulary: 70, // Static placeholder
            speaking: 75,   // Static placeholder
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
      roadmapCount: fullRoadmap.length,
      nextLevelRequirements: MASTER_SYLLABUS[levels[levels.indexOf(finalLevel) + 1]] || []
    });

  } catch (err) {
    console.error("Assessment submission error:", err);
    res.status(500).json({ message: "Failed to process roadmap." });
  }
});

/* =============================================================================
   GET /api/assessment/result
   ============================================================================= */
router.get('/result', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('placementTest grammarWeaknesses proficiencyLevel');
    if (!user || !user.placementTest || user.placementTest.level === 'none') {
      return res.status(404).json({ message: "No result found." });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
