// server/routes/assessment.js
// -----------------------------------------------------------------------------
// Version 7.0.0 - DUAL-CORE CEFR ENGINE (WRITTEN + ORAL MERGE)
// - ADDED: Gemini 1.5 Flash Speaking Analysis.
// - MERGED: 100% of the 80+ item Master Syllabus roadmap logic.
// - LOGIC: Calculates separate Written and Speaking tiers to find an Integrated Average.
// - MANDATORY: No truncation. This is the complete file.
// -----------------------------------------------------------------------------

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini for Real Speaking Analysis
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

/**
 * THE MASTER LERNITT SYLLABUS
 * Preserved: 100% of your academic categories for roadmap generation.
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
 * THE DIAGNOSTIC MAPPING
 * Preserved: The 25 objective written checkpoints.
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

/**
 * AI ORAL EVALUATOR
 * Uses Gemini to evaluate the transcript for CEFR levels and syllabus gaps.
 */
async function evaluateSpeaking(transcript) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are a senior academic English examiner. 
      Analyze the following student transcript for a CEFR level (A1 to C2).
      Transcript: "${transcript}"
      
      Instructions:
      1. Determine the Oral Tier (A1, A2, B1, B2, C1, or C2).
      2. Identify any specific grammatical categories the student struggled with (use Master Syllabus terminology if possible).
      3. Provide a brief academic insight for the student.

      Return ONLY a JSON object:
      {
        "level": "B1",
        "detectedGaps": ["Past Continuous", "First Conditional"],
        "feedback": "Your oral fluency is good, but you struggle with future uncertainty structures."
      }
    `;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("AI Oral Evaluation Error:", err);
    return { level: "A1", detectedGaps: [], feedback: "Speaking analysis currently based on structural defaults." };
  }
}

/* =============================================================================
   POST /api/assessment/submit
   Calculates Integrated level (Written + Oral) and generates a Full Roadmap.
   ============================================================================= */
router.post('/submit', auth, async (req, res) => {
  try {
    const { answers, transcript } = req.body;

    // --- PHASE 1: WRITTEN ANALYSIS ---
    let writtenMisses = [];
    let correctByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    let totalByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };

    Object.keys(ANSWER_KEY).forEach(qId => {
      const data = ANSWER_KEY[qId];
      totalByLevel[data.level]++;
      if (answers && answers[qId] === data.correct) {
        correctByLevel[data.level]++;
      } else {
        writtenMisses.push({ category: data.level, component: data.comp });
      }
    });

    let writtenLevel = "A1";
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    for (let lvl of levels) {
      if ((correctByLevel[lvl] / totalByLevel[lvl]) >= 0.8) {
        writtenLevel = lvl;
      } else {
        break; 
      }
    }

    // --- PHASE 2: ORAL ANALYSIS ---
    const oralResult = await evaluateSpeaking(transcript || "No verbal input captured.");
    const speakingLevel = oralResult.level;

    // --- PHASE 3: INTEGRATED OVERALL LEVEL ---
    // Average index calculation: (Written Index + Speaking Index) / 2
    const wIdx = levels.indexOf(writtenLevel);
    const sIdx = levels.indexOf(speakingLevel);
    const avgIdx = Math.floor((wIdx + sIdx) / 2);
    const overallLevel = levels[avgIdx];

    // --- PHASE 4: GENERATE FULL ROADMAP ---
    // Merge written misses + oral gaps + all future requirements
    let fullRoadmap = [...writtenMisses];
    
    // Add gaps found by AI in speaking
    oralResult.detectedGaps.forEach(gap => {
      if (!fullRoadmap.some(r => r.component === gap)) {
        fullRoadmap.push({ category: speakingLevel, component: gap });
      }
    });

    // Add everything from higher CEFR levels (Your integrated teaching checklist)
    levels.forEach(lvl => {
      if (levels.indexOf(lvl) > levels.indexOf(overallLevel)) {
        MASTER_SYLLABUS[lvl].forEach(item => {
          if (!fullRoadmap.some(r => r.component === item)) {
            fullRoadmap.push({ category: lvl, component: item });
          }
        });
      }
    });

    // --- PHASE 5: UPDATE USER PROFILE ---
    await User.findByIdAndUpdate(req.user.id, {
      proficiencyLevel: overallLevel,
      grammarWeaknesses: fullRoadmap,
      placementTest: {
        level: overallLevel,
        scores: {
          written: writtenLevel,
          speaking: speakingLevel,
          overall: overallLevel,
          grammarAccuracy: Math.round((Object.values(correctByLevel).reduce((a, b) => a + b, 0) / 25) * 100)
        },
        insights: oralResult.feedback,
        completedAt: new Date()
      }
    });

    res.json({
      success: true,
      overallLevel,
      writtenLevel,
      speakingLevel,
      feedback: oralResult.feedback,
      roadmapCount: fullRoadmap.length,
      nextTierRequirements: MASTER_SYLLABUS[levels[levels.indexOf(overallLevel) + 1]] || []
    });

  } catch (err) {
    console.error("Critical Assessment Merge Error:", err);
    res.status(500).json({ message: "Failed to process dual-core results." });
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
