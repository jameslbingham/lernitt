// /client/src/pages/WelcomeSetup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

// FIX: Pointing to the live integrated service
const API = import.meta.env.VITE_API || "https://lernitt.onrender.com";
const MOCK = import.meta.env.VITE_MOCK === "1";

export default function WelcomeSetup() {
  const nav = useNavigate();
  const { user, refreshUser } = useAuth();

  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [commitment, setCommitment] = useState("2"); // Default to 2 hours/week
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const name = user?.name || "Student";

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);

    try {
      if (MOCK) {
        nav("/tutors", { replace: true });
        return;
      }

      /**
       * SOPHISTICATED PLUMBING: 
       * Saves a structured 'learningProfile' object to MongoDB for tutor insights.
       */
      await apiFetch(`${API}/api/profile/student-setup`, {
        method: "POST",
        body: { 
          learningProfile: {
            targetLanguage: language,
            cefrLevel: level,
            primaryGoal: goal,
            weeklyCommitment: Number(commitment)
          }
        },
      });

      // Synchronize the local session with the new database data
      await refreshUser();
      
      // Redirect to the Marketplace
      nav("/tutors", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Academic synchronization failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <main className="mx-auto max-w-xl px-6 py-16">
        
        {/* SOPHISTICATED HEADER */}
        <div className="mb-10 text-center space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-4">
            Phase 2: Academic Handshake
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">
            Welcome, {name}! 🎉
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Let&apos;s engineer your learning path so our elite tutors can help you achieve your goals.
          </p>
        </div>

        {/* MAIN SETUP CARD */}
        <section className="rounded-[40px] bg-white p-10 shadow-2xl border border-slate-100 space-y-8">
          
          {err && (
            <div role="alert" className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">What will you master first?</label>
              <select
                value={language}
                onChange={(e) => {
                    setLanguage(e.target.value);
                    // Reset level if language changes to ensure Bridge logic stays fresh
                    if (level === "unknown") setLevel(""); 
                }}
                required
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">Select a language…</option>
                <option value="english">English (Global/Business)</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="german">German</option>
                <option value="japanese">Japanese</option>
                <option value="korean">Korean</option>
                <option value="chinese">Chinese (Mandarin)</option>
              </select>
            </div>

            {/* CEFR Level & Selective AI Placement Bridge */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Your current Academic Band (CEFR)</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">Choose your level…</option>
                <option value="A0">Absolute Beginner (A0)</option>
                <option value="A1">Elementary (A1)</option>
                <option value="B1">Intermediate (B1)</option>
                <option value="B2">Upper Intermediate (B2)</option>
                <option value="C1">Advanced Proficiency (C1)</option>
                <option value="unknown">I am not sure of my level</option>
              </select>

              {/* SOPHISTICATED FEATURE: Selective English AI Placement Bridge */}
              {level === "unknown" && language === "english" && (
                <div className="mt-4 p-5 bg-indigo-50 rounded-[24px] border border-indigo-100 text-center animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs text-indigo-700 font-bold mb-3">Not sure? Our English AI can evaluate you in 5 minutes.</p>
                  <Link 
                    to="/placement-test" 
                    className="inline-block text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    Take AI Placement Test
                  </Link>
                </div>
              )}

              {/* Logic for Non-English unknown levels */}
              {level === "unknown" && language !== "english" && language !== "" && (
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-500 font-bold leading-tight">
                    No problem! Select "Absolute Beginner" for now, and your tutor will assess you during your first trial lesson.
                  </p>
                </div>
              )}
            </div>

            {/* Goal Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Primary Objective</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">Select your focus…</option>
                <option value="conversation">Real-world Speaking & Fluency</option>
                <option value="business">Professional/Career Advancement</option>
                <option value="exam">Academic/Exam Prep (IELTS/TOEFL)</option>
                <option value="grammar">Technical Writing & Grammar</option>
                <option value="travel">Expedient Travel Prep</option>
              </select>
            </div>

            {/* Business Insight: Commitment Level Slider */}
            <div className="space-y-2 pb-4">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weekly Commitment Target</label>
                <span className="text-sm font-black text-indigo-600">{commitment} hours</span>
              </div>
              <div className="flex items-center gap-4 px-2">
                <input 
                  type="range" min="1" max="10" 
                  value={commitment} 
                  onChange={(e) => setCommitment(e.target.value)} 
                  className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold text-center italic">This helps us prioritize your tutor matchmaking.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-6 py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-30 disabled:hover:bg-slate-900"
            >
              {loading ? "Synchronizing Profile..." : "Complete Handshake"}
            </button>
          </form>

          {/* CROSS-FLOW: TUTOR CONVERSION (Preserved) */}
          <div className="pt-8 border-t border-slate-50">
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-tighter">Are you an Educator?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">If you registered as a student by mistake, you can switch to the tutor application protocol below.</p>
              <button
                type="button"
                onClick={() => nav("/tutor-profile-setup")}
                className="w-full rounded-xl border-2 border-indigo-100 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:border-indigo-600 transition-all"
              >
                Become a Tutor
              </button>
            </div>
          </div>
        </section>

        <p className="text-center mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">
          Lernitt Academic Onboarding Protocol v4.2.0
        </p>
      </main>
    </div>
  );
}
