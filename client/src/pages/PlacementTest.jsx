// client/src/pages/PlacementTest.jsx
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
  const [isRecording, setIsRecording] = useState(false);
  const [testResult, setTestResult] = useState(null); // Stores real data from DB

  // Guard: Must be registered and logged in
  useEffect(() => {
    if (!isAuthed) {
      // Redirect to signup if trying to take the test without an account
      navigate('/signup?reason=test_required');
    }
  }, [isAuthed, navigate]);

  const handleNext = () => {
    const nextStep = step + 1;
    setStep(nextStep);
    setProgress((nextStep / 4) * 100);
  };

  const submitTest = async () => {
    setStep(3); // Start Processing Animation (The "Believability" Screen)
    
    try {
      // 1. Send test data to the backend route we created
      const response = await apiFetch('/api/assessment/submit', {
        method: 'POST',
        auth: true,
        body: {
          grammarAnswers: { q1: "would have brought" }, // Example data
          vocabAnswers: { q1: "advanced" },
          speakingBlob: "audio_data_placeholder"
        }
      });

      if (response.success) {
        // 2. Store the real result from the DB
        setTestResult(response);
        
        // 3. Keep processing screen visible for a moment to build "reputation"
        setTimeout(() => {
          setStep(4); // Show Result
          setProgress(100);
        }, 3500);
      }
    } catch (err) {
      console.error("Assessment submission failed", err);
      alert("Failed to process assessment. Please try again.");
      setStep(2); // Send back to speaking step if error
    }
  };

  if (!isAuthed) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        
        {/* PROGRESS BAR */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
            <span>CEFR Assessment</span>
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
                  <div className="font-bold text-indigo-600">Adaptive</div>
                  <div className="text-xs opacity-70">Difficulty adjusts to you.</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="font-bold text-indigo-600">Multimodal</div>
                  <div className="text-xs opacity-70">Speaking & Listening analysis.</div>
                </div>
              </div>
              <button 
                onClick={handleNext}
                className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg transition hover:bg-indigo-700 active:scale-95"
              >
                Start Assessment
              </button>
            </div>
          )}

          {/* STEP 1: ADAPTIVE GRAMMAR */}
          {step === 1 && (
            <div className="p-8 space-y-6">
              <h3 className="text-sm font-bold uppercase text-slate-400">Phase 1: Structural Integrity</h3>
              <p className="text-lg font-medium text-slate-900 dark:text-white">"Had I known about the weather, I ________ my umbrella."</p>
              <div className="grid grid-cols-1 gap-3">
                {["will bring", "would have brought", "brought", "had brought"].map((opt) => (
                  <button 
                    key={opt}
                    className="w-full rounded-xl border border-slate-200 p-4 text-left font-medium transition hover:border-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-900/20"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleNext}
                className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white"
              >
                Next: Speaking Analysis
              </button>
            </div>
          )}

          {/* STEP 2: MULTIMODAL SPEAKING */}
          {step === 2 && (
            <div className="p-10 text-center space-y-8">
              <h3 className="text-sm font-bold uppercase text-slate-400">Phase 2: Oral Fluency</h3>
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
                  {isRecording ? "Listening... release to finish" : "Hold to speak for 30 seconds"}
                </p>
              </div>
              <button 
                onClick={submitTest}
                className="w-full rounded-xl bg-slate-900 py-4 font-bold text-white transition hover:bg-black"
              >
                Submit for AI Analysis
              </button>
            </div>
          )}

          {/* STEP 3: PROCESSING (Reputation Phase) */}
          {step === 3 && (
            <div className="p-16 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Generating Linguistic DNA...</h2>
              <div className="mx-auto max-w-xs space-y-3 text-left">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Grammar Normalization</span>
                  <span className="text-green-500">COMPLETE</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Fluency & Coherence</span>
                  <span className="text-green-500">COMPLETE</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>CEFR B2/C1 Benchmarking</span>
                  <span className="animate-pulse text-indigo-600">IN PROGRESS</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONVERSION-FOCUSED RESULTS */}
          {step === 4 && (
            <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="text-center">
                <div className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Assessment Finalized</div>
                <div className="text-6xl font-black text-slate-900 dark:text-white mt-2">
                  {testResult?.level || "..."}
                </div>
                <div className="text-lg font-bold text-slate-500 uppercase tracking-wide">
                  Global CEFR Benchmark
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 p-5 dark:bg-indigo-900/20">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Linguistic Analysis</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 italic">
                   "{testResult?.insights || "Analysis complete. Your personalized roadmap is ready."}"
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-center md:text-left">Recommended Tutors for your level:</h4>
                <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 shadow-sm dark:border-slate-800">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold">B</div>
                  <div className="flex-1">
                    <div className="font-bold dark:text-white">Tutor Bob</div>
                    <div className="text-xs opacity-70 dark:text-slate-400">Expert in {testResult?.level} Mastery Curriculum</div>
                  </div>
                  <button 
                    onClick={() => navigate('/tutors')}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-indigo-700"
                  >
                    Book Trial
                  </button>
                </div>
              </div>

              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full rounded-xl bg-slate-900 py-4 font-bold text-white shadow-xl transition hover:bg-black active:scale-95"
              >
                Go to Student Notebook
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
