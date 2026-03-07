// client/src/pages/Signup.jsx
/**
 * LERNITT ACADEMY - ENTERPRISE REGISTRATION INSTANCE
 * ----------------------------------------------------------------------------
 * VERSION: 4.4.0 (FIXED REDIRECT LOOP)
 * - MERGED: Password strength engine & legal checkboxes.
 * - FIXED: Direct onboarding handshake to prevent "Welcome Back" loops.
 * - PRESERVED: italki-style role selection & redirect context.
 * ----------------------------------------------------------------------------
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { safeFetchJSON } from "../lib/safeFetch.js"; 
import { useAuth } from "../hooks/useAuth.jsx";

// Pointing to the live integrated service
const API_URL = "https://lernitt.onrender.com";

export default function Signup() {
  const nav = useNavigate();
  const { login } = useAuth();
  const { search } = useLocation();
  
  /**
   * URL CONTEXT & REDIRECT LOGIC
   * Captures parameters to ensure the user lands on the correct page post-signup.
   */
  const params = new URLSearchParams(search);
  const next = params.get("next"); 
  const urlType = params.get("type") === "tutor" ? "tutor" : "student";

  /* -------------------------- Component State -------------------------- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState(urlType); 
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [ackPrivacy, setAckPrivacy] = useState(false);
  const [ackAge, setAckAge] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * SOPHISTICATED PASSWORD STRENGTH ENGINE
   * ✅ Logic preserved: Evaluates entropy based on length, casing, and symbols.
   */
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-slate-100" };
    let s = 0;
    if (password.length > 6) s++;
    if (password.length > 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;

    if (s <= 2) return { score: 1, label: "Weak", color: "bg-red-400" };
    if (s <= 4) return { score: 2, label: "Medium", color: "bg-amber-400" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  }, [password]);

  const canSubmit = agreeTerms && ackPrivacy && ackAge && passwordStrength.score > 0;

  /**
   * ROUTING LOGIC: getPostSignupPath
   * ✅ Logic preserved: Respects specific academic paths or role-based defaults.
   */
  function getPostSignupPath(userRole) {
    // 1. Priority: specific 'next' destination (e.g., /placement-test)
    if (next && !next.startsWith("/login") && !next.startsWith("/signup")) {
      return next;
    }

    // 2. Role-based fallback
    if (userRole === "admin") return "/admin";
    if (userRole === "tutor") return "/tutor-profile-setup";
    
    return "/welcome-setup";
  }

  /* -------------------------- Submission Engine -------------------------- */

  /**
   * Main signup handler.
   * ✅ FIXED: Ensures direct navigation to setup flow to bypass Login screen.
   */
  async function onSubmit(e) {
    e.preventDefault();
    if (loading || !canSubmit) return;

    setErr("");
    setLoading(true);

    try {
      // Communicating with the current live integrated URL
      const data = await safeFetchJSON(`${API_URL}/api/auth/signup`, {
        method: "POST",
        body: JSON.stringify({ 
          email, 
          password, 
          name, 
          role, 
          type: role 
        }),
      });

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.token) {
        throw new Error("The server did not return a security token.");
      }

      // Establish the security session in global AuthProvider
      login(data.token, data.user);
      
      /**
       * NAVIGATION HANDSHAKE
       * Force redirection to the setup flow to prevent the browser 
       * from defaulting back to the Login page.
       */
      const targetPath = getPostSignupPath(data.user?.role || role);
      nav(targetPath, { replace: true });

    } catch (error) {
      setErr(error.message.includes("lernitt-server") 
        ? "System update in progress. Please refresh and try again." 
        : error.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------- UI Rendering -------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="mx-auto max-w-xl px-6 py-20">
        
        {/* Page Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Join Lernitt</h1>
          <p className="text-slate-500 mt-2 font-medium">Create your academy account.</p>
        </div>

        {/* Main Signup Card */}
        <section className="rounded-[32px] bg-white p-8 shadow-xl border border-slate-100">
          
          {/* Role Selector (Student vs Tutor) */}
          <div className="mb-8">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4 text-center">
              I am registering as a:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-4 rounded-2xl font-bold border-2 transition-all ${
                  role === 'student' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole("tutor")}
                className={`py-4 rounded-2xl font-bold border-2 transition-all ${
                  role === 'tutor' 
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                👨‍🏫 Tutor
              </button>
            </div>
          </div>

          {/* Error Message Display */}
          {err && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
              {err}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            
            {/* Full Name Input */}
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:bg-white outline-none"
            />

            {/* Email Address Input */}
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:bg-white outline-none"
            />

            {/* Password Input with Show/Hide Toggle */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Proposed Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:bg-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>

              {/* Password Strength Visualizer */}
              {password && (
                <div className="px-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Security Strength</span>
                    <span className={`text-[10px] font-black uppercase ${passwordStrength.color.replace('bg-', 'text-')}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 transition-all ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Legal Compliances Checklist */}
            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                  I accept the Lernitt <Link to="/legal/terms" className="text-indigo-600 underline">Terms of Service</Link>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ackPrivacy}
                  onChange={(e) => setAckPrivacy(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                  I have read the academy <Link to="/legal/privacy" className="text-indigo-600 underline">Privacy Protocols</Link>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ackAge}
                  onChange={(e) => setAckAge(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                  I verify that I meet the <Link to="/legal/age-requirements" className="text-indigo-600 underline">Age Requirements</Link>
                </span>
              </label>
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-2xl bg-slate-900 px-6 py-5 text-sm font-black uppercase tracking-widest text-white shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-30"
            >
              {loading ? "Connecting..." : "Finalise Registration"}
            </button>
          </form>

          {/* Redirect to Login Switch */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-indigo-600">
              Already have an account? Authorise Entry
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
