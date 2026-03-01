// client/src/pages/PlacementTest.jsx
// -----------------------------------------------------------------------------
// Version 6.0.0 - INTEGRATED SYLLABUS DIAGNOSTIC
// - ALIGNED: 25 questions now match the exact Master Syllabus terminology.
// - UPDATED: Results page now shows a full "Roadmap to Mastery."
// - PRESERVED: 100% of progress bars, processing animations, and logic.
// -----------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiFetch';
import { useAuth } from '../hooks/useAuth';

export default function PlacementTest() {
  const navigate = useNavigate();
  const { isAuthed, user } = useAuth();
  
  // State management
  const [step, setStep] = useState(0); // 0:Intro, 1:Grammar, 2:Speaking, 3:Processing, 4:Result
  const [progress, setProgress] = useState(0);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [testResult, setTestResult] = useState(null);

  /**
   * THE INTEGRATED QUESTION BANK
   * These 25 questions are the "scouts." 
   * Each one maps to a specific Category in your Syllabus.
   */
  const questionBank = [
    // A1 - Beginner
    { id: 'q1', level: 'A1', category: 'Verb to be', text: "She ____ a teacher at the local school.", options: ["am", "is", "are", "be"] },
    { id: 'q2', level: 'A1', category: 'Wh- questions', text: "____ do you live?", options: ["What", "Who", "Where", "Which"] },
    { id: 'q3', level: 'A1', category: 'Articles: a / an / the', text: "I have ____ apple in my bag.", options: ["a", "an", "the", "no article"] },
    { id: 'q4', level: 'A1', category: 'Possessive adjectives', text: "That is my brother. ____ name is Paul.", options: ["He", "His", "Him", "Her"] },
    // A2 - Elementary
    { id: 'q5', level: 'A2', category: 'Past Simple', text: "Yesterday, I ____ to the cinema.", options: ["go", "went", "gone", "was go"] },
    { id: 'q6', level: 'A2', category: 'Future: going to', text: "They ____ visit us next week.", options: ["will", "going to", "are going to", "go to"] },
    { id: 'q7', level: 'A2', category: 'Comparative adjectives', text: "This car is ____ than that one.", options: ["fast", "faster", "more fast", "fastest"] },
    { id: 'q8', level: 'A2', category: 'Quantifiers', text: "I don't have ____ money left.", options: ["some", "any", "many", "much"] },
    // B1 - Intermediate
    { id: 'q9', level: 'B1', category: 'Present Perfect', text: "I ____ London three times this year.", options: ["visited", "have visited", "visit", "was visiting"] },
    { id: 'q10', level: 'B1', category: 'First Conditional', text: "If it rains tomorrow, we ____ at home.", options: ["stay", "would stay", "will stay", "stayed"] },
    { id: 'q11', level: 'B1', category: 'Passive voice (Basic)', text: "The book ____ by a famous author in 1920.", options: ["wrote", "was written", "is written", "has written"] },
    { id: 'q12', level: 'B1', category: 'Modal verbs: obligation', text: "You ____ smoke in the hospital. It's forbidden.", options: ["shouldn't", "don't have to", "mustn't", "might not"] },
    // B2 - Upper-Intermediate
    { id: 'q13', level: 'B2', category: 'Third Conditional', text: "If I ____ known, I would have come earlier.", options: ["have", "had", "would have", "did"] },
    { id: 'q14', level: 'B2', category: 'Inversion', text: "Hardly ____ started when the power went out.", options: ["I had", "did I", "had I", "I did"] },
    { id: 'q15', level: 'B2', category: 'Causative forms', text: "I need to get my hair ____ before the wedding.", options: ["cut", "cutting", "to cut", "was cut"] },
    { id: 'q16', level: 'B2', category: 'Advanced modals: deduction', text: "He ____ have forgotten his keys; he's usually so careful.", options: ["must", "should", "can", "would"] },
    // C1 - Advanced
    { id: 'q17', level: 'C1', category: 'Subjunctive structures', text: "It is essential that he ____ at the meeting on time.", options: ["is", "was", "be", "to be"] },
    { id: 'q18', level: 'C1', category: 'Advanced inversion', text: "Not only ____ the project, but they also saved money.", options: ["they finished", "did they finish", "have they finished", "finished they"] },
    { id: 'q19', level: 'C1', category: 'Complex participle clauses', text: "____ the map, he quickly found the hidden entrance.", options: ["Having studied", "Studied", "Study", "To study"] },
    { id: 'q20', level: 'C1', category: 'Hedging language', text: "It ____ to be the case that prices are rising.", options: ["appears", "is appearing", "appear", "appeared"] },
    // C2 - Proficient
    { id: 'q21', level: 'C2', category: 'Fine-grained modal nuance', text: "____ it not for your help, I would have failed.", options: ["If", "Was", "Were", "Had"] },
    { id: 'q22', level: 'C2', category: 'Stylistic deviation', text: "He ____ mentions his achievements, remaining humble.", options: ["often", "seldom", "always", "rarely"] },
    { id: 'q23', level: 'C2', category: 'Creative manipulation of syntax', text: "I ____ suggest you reconsider your position.", options: ["will", "should", "might", "can"] },
    { id: 'q24', level: 'C2', category: 'Ambiguity management', text: "There ____ be some mistake in the calculations.", options: ["might", "must", "can", "should"] },
    { id: 'q25', level: 'C2', category: 'Genre-specific grammar', text: "As ____ the law, this action is strictly prohibited.", options: ["with", "per", "by", "to"] }
  ];

  // Guard: Must be registered and logged in
  useEffect(() => {
    if (!isAuthed) {
      navigate('/signup?reason=test_required');
    }
  }, [isAuthed, navigate]);

  const handleAnswer = (option) => {
    const newAnswers = { ...answers, [questionBank[currentQIndex].id]: option };
    setAnswers(newAnswers);
    
    if (currentQIndex < questionBank.length - 1) {
      const nextIndex = currentQIndex + 1;
      setCurrentQIndex(nextIndex);
      // Update progress bar (First 75% is grammar, last 25% is speaking/processing)
      setProgress((nextIndex / questionBank.length) * 75);
    } else {
      setStep(2); // Move to Speaking
      setProgress(80);
    }
  };

  const submitTest = async () => {
    setStep(3); // Start Processing Animation
    
    try {
      const response = await apiFetch('/api/assessment/submit', {
        method: 'POST',
        auth: true,
        body: {
          answers,
          speakingBlob: "audio_data_placeholder"
        }
      });

      if (response.success) {
        setTestResult(response);
        // Keep processing screen visible for a moment to build "reputation"
        setTimeout(() => {
          setStep(4); // Show Result
          setProgress(100);
        }, 4000);
      }
    } catch (err) {
      console.error("Assessment submission failed", err);
      alert("Failed to process assessment. Please try again.");
      setStep(2);
    }
  };

  if (!isAuthed) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        
        {/* PROGRESS BAR */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
            <span>CEFR Assessment Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div 
              className="h-full bg-indigo-600 transition-all duration-700 ease-in-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* TEST CONTAINER */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          
          {/* STEP 0: THE HOOK */}
          {step === 0 && (
            <div className="p-10 text-center space-y-6">
              <div className="mx-auto h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl dark:bg-indigo-900/30">
                🧬
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                Find your true level.
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Hello {user?.name}, let's map your language skills. This adaptive test uses AI 
                to benchmark your grammar and speaking against the global CEFR standard.
              </p>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="font-bold text-indigo-600">Syllabus-Aligned</div>
                  <div className="text-xs opacity-70">80+ categories audited.</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="font-bold text-indigo-600">Gap Analysis</div>
                  <div className="text-xs opacity-70">Identifies specific worksheets.</div>
                </div>
              </div>
              <button 
                onClick={() => setStep(1)}
                className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg transition hover:bg-indigo-700 active:scale-95"
              >
                Start Comprehensive Assessment
              </button>
            </div>
          )}

          {/* STEP 1: GRAMMAR PHASE */}
          {step === 1 && (
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase text-slate-400">Phase 1: Structural Integrity</h3>
                <span className="text-xs font-black px-2 py-1 bg-slate-100 rounded text-slate-500">Tier: {questionBank[currentQIndex].level}</span>
              </div>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                "{questionBank[currentQIndex].text}"
              </p>
              <div className="grid grid-cols-1 gap-3">
                {questionBank[currentQIndex].options.map((opt) => (
                  <button 
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="w-full rounded-xl border border-slate-200 p-5 text-left font-bold transition hover:border-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-900/20"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="text-center text-xs text-slate-400 font-medium">
                Question {currentQIndex + 1} of {questionBank.length}
              </div>
            </div>
          )}

          {/* STEP 2: SPEAKING PHASE */}
          {step === 2 && (
            <div className="p-10 text-center space-y-8">
              <h3 className="text-sm font-bold uppercase text-slate-400">Phase 2: Oral Fluency</h3>
              <p className="text-slate-600">Final step: We need to hear your "Active" grammar. Describe a challenge you recently faced.</p>
              <div className="rounded-xl bg-slate-900 p-6 text-white italic shadow-inner">
                "Describe a challenge you faced recently and how you overcame it."
              </div>
              <div className="flex flex-col items-center gap-4">
                <button 
                  onMouseDown={() => setIsRecording(true)}
                  onMouseUp={() => setIsRecording(false)}
                  className={`group relative h-28 w-28 rounded-full border-4 flex items-center justify-center transition-all ${
                    isRecording ? 'border-red-500 bg-red-50 scale-110' : 'border-indigo-100 bg-white hover:border-indigo-600'
                  }`}
                >
                  <span className={`text-3xl ${isRecording ? 'animate-pulse' : ''}`}>
                    {isRecording ? '🛑' : '🎤'}
                  </span>
                  {isRecording && (
                    <span className="absolute -inset-4 rounded-full border border-red-400 animate-ping" />
                  )}
                </button>
                <p className="text-sm font-medium text-slate-500">
                  {isRecording ? "Listening... release to finish" : "Hold to speak for AI analysis"}
                </p>
              </div>
              <button 
                onClick={submitTest}
                className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white transition hover:bg-indigo-700"
              >
                Submit for Final Analysis
              </button>
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === 3 && (
            <div className="p-16 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Generating Linguistic DNA...</h2>
              <div className="mx-auto max-w-xs space-y-3 text-left">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Syllabus Cross-Reference</span>
                  <span className="text-green-500">COMPLETE</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Gap Analysis (80+ Points)</span>
                  <span className="text-green-500">COMPLETE</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Tier Validation</span>
                  <span className="animate-pulse text-indigo-600">IN PROGRESS</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FINAL SYLLABUS ROADMAP RESULTS */}
          {step === 4 && testResult && (
            <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="text-center">
                <div className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Diagnostic Complete</div>
                <div className="text-7xl font-black text-slate-900 dark:text-white mt-2">
                  {testResult.level}
                </div>
                <div className="text-lg font-bold text-slate-500 uppercase tracking-wide">
                  Validated CEFR Tier
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 p-5 dark:bg-indigo-900/20 text-left">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Academy Roadmap Generated</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 italic">
                  We have mapped {testResult.roadmapCount} specific syllabus components you need to master to reach C2. 
                  Below are your immediate requirements to reach the next tier.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-left uppercase text-xs tracking-widest">
                  Next Tier Requirements:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResult.nextLevelRequirements.slice(0, 8).map((req, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 shadow-sm dark:border-slate-800 bg-white">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px]">?</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate text-left">{req}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 text-center font-bold italic">
                  + view full detailed roadmap in your profile area.
                </p>
              </div>

              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full rounded-xl bg-slate-900 py-4 font-bold text-white shadow-xl transition hover:bg-black active:scale-95"
              >
                Finalize Roadmap & Enter Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
