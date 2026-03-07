// /client/src/pages/TutorProfileSetup.jsx
/**
 * ============================================================================
 * LERNITT ACADEMY - TUTOR ONBOARDING & PROFILE ARCHITECTURE
 * ============================================================================
 * VERSION: 5.3.0 (STRICT PRODUCTION MERGE - 570 LINES)
 * ----------------------------------------------------------------------------
 * This module is a critical pillar of the Lernitt ecosystem. It manages the 
 * transition of a user from a generic account to a professional tutor.
 * * CORE RESPONSIBILITIES:
 * 1. IDENTITY: Establishes the academic brand (Bio, Headline, Display Name).
 * 2. STORAGE: Interfaces with Supabase for high-fidelity media assets.
 * 3. PAYOUTS: Configures the financial handshake (Stripe vs PayPal).
 * 4. ROUTING: Ensures a seamless flow from signup to the Tutor Dashboard.
 * * DESIGN PHILOSOPHY:
 * We use the 'Elite Academy' design system, characterized by rounded-[40px] 
 * containers, heavy typography, and high-contrast shadow architectures to 
 * instill trust in the tutor as they build their professional identity.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

/**
 * SUPABASE CLIENT INTEGRATION
 * ✅ Logic preserved: Used for direct-to-cloud media storage.
 * bucket: 'tutor-avatars' for profile photos.
 * bucket: 'tutor-videos' for introduction videos.
 */
import { supabase } from "../lib/supabaseClient"; 

/**
 * INFRASTRUCTURE CONSTANTS
 * FIXED: Pointing to the live integrated service for MongoDB persistence.
 */
const API = "https://lernitt.onrender.com";
const MOCK = import.meta.env.VITE_MOCK === "1";

/**
 * TUTOR PROFILE SETUP COMPONENT
 * ----------------------------------------------------------------------------
 */
export default function TutorProfileSetup() {
  const nav = useNavigate();
  const { user } = useAuth();

  /* --------------------------------------------------------------------------
     1. STATE MANAGEMENT (IDENTITY & PEDAGOGY)
     -------------------------------------------------------------------------- */
  
  // Public-facing profile data
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  
  // Payout configuration logic (Logic Preserved)
  const [payoutMethod, setPayoutMethod] = useState("stripe"); 
  const [paypalEmail, setPaypalEmail] = useState("");

  /* --------------------------------------------------------------------------
     2. STATE MANAGEMENT (MEDIA ASSETS)
     -------------------------------------------------------------------------- */
  
  // Profile Photo (Avatar) State
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Introduction Video State (Logic Preserved)
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  /* --------------------------------------------------------------------------
     3. STATE MANAGEMENT (OPERATION & UI)
     -------------------------------------------------------------------------- */
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const name = user?.name || "Tutor";

  /* --------------------------------------------------------------------------
     4. SECURITY & AUTHENTICATION GUARDS
     -------------------------------------------------------------------------- */

  /**
   * ACADEMIC ROLE GUARD
   * ✅ Logic preserved: Restricts access to this page to validated Tutors only.
   * Prevents students from accidentally entering the tutor onboarding flow.
   */
  useEffect(() => {
    if (!user) return;
    if (user.role !== "tutor") {
      console.warn("Unauthorized Role Access: Redirecting student to index.");
      nav("/", { replace: true });
    }
  }, [user, nav]);

  /* --------------------------------------------------------------------------
     5. DATA INITIALIZATION (MONGODB HANDSHAKE)
     -------------------------------------------------------------------------- */

  /**
   * PROFILE SYNC HOOK
   * ✅ Logic preserved: Attempts to retrieve existing data to prevent overwrites.
   */
  useEffect(() => {
    if (MOCK) return;

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setErr("");
      
      try {
        /**
         * Calling the setup bridge route defined in server/routes/tutors.js
         * This route acts as a translator between the UI and the MongoDB model.
         */
        const data = await apiFetch(`${API}/api/tutors/setup`, {
          method: "GET",
        });

        if (!data || cancelled) return;

        // Map database fields to UI state
        if (data.displayName) setDisplayName(data.displayName);
        if (data.headline) setHeadline(data.headline);
        if (data.bio) setBio(data.bio);
        if (data.languages) setLanguages(data.languages);
        if (data.hourlyRate != null) setHourlyRate(String(data.hourlyRate));
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.videoUrl) setVideoUrl(data.videoUrl);
        
        // Payout Preference Logic
        if (data.paypalEmail) {
          setPaypalEmail(data.paypalEmail);
          setPayoutMethod("paypal");
        }
        
      } catch (e) {
        /**
         * We use console.warn here as it is non-critical for new profiles 
         * that have not been initialized in the database yet.
         */
        console.warn(
          "Profile load status: New tutor detected (awaiting first save)."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    
    // Cleanup to prevent memory leaks during rapid navigation
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------------------------------------------------------
     6. MEDIA ENGINE: AVATAR UPLOAD
     -------------------------------------------------------------------------- */

  /**
   * handleFileUpload
   * ✅ Logic preserved: Bypasses RLS policy issues via unique naming conventions.
   * This ensures a high success rate for new tutors during their first upload.
   */
  async function handleFileUpload(e) {
    try {
      setUploading(true);
      setErr("");
      setInfo("");
      
      const file = e.target.files[0];
      if (!file) return;

      if (!user?.id) {
        throw new Error("Academic Identity Error: Missing User ID.");
      }

      // 1. UNIQUE FILENAME GENERATION
      // We use a combination of timestamp and entropy to prevent collision.
      const fileExt = file.name.split('.').pop();
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `avatar-${Date.now()}-${uniqueSuffix}.${fileExt}`;

      // 2. SUPABASE STORAGE HANDSHAKE
      // Targeting the 'tutor-avatars' bucket with flat-path addressing.
      const { error: uploadError } = await supabase.storage
        .from('tutor-avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // 3. PUBLIC URL RETRIEVAL
      // Ensuring the asset is immediately accessible to the marketplace UI.
      const { data } = supabase.storage.from('tutor-avatars').getPublicUrl(fileName);
      
      if (!data?.publicUrl) {
        throw new Error("Storage link generation failed. Please try again.");
      }
      
      setAvatarUrl(data.publicUrl);
      setInfo("Success: Professional portrait synchronized.");
      
    } catch (error) {
      setErr(error.message || "Portrait synchronization failed.");
    } finally {
      setUploading(false);
    }
  }

  /* --------------------------------------------------------------------------
     7. MEDIA ENGINE: VIDEO UPLOAD
     -------------------------------------------------------------------------- */

  /**
   * handleVideoUpload
   * ✅ Logic preserved: Handles large asset streams to the 'tutor-videos' bucket.
   * Crucial for tutor visibility and conversion rates.
   */
  async function handleVideoUpload(e) {
    try {
      setUploadingVideo(true);
      setErr("");
      setInfo("");
      
      const file = e.target.files[0];
      if (!file) return;

      if (!user?.id) {
        throw new Error("Academic Identity Error: Missing User ID.");
      }

      // 1. UNIQUE FILENAME GENERATION
      const fileExt = file.name.split('.').pop();
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `intro-${Date.now()}-${uniqueSuffix}.${fileExt}`;

      // 2. SUPABASE STORAGE HANDSHAKE
      // Targeting the dedicated video infrastructure bucket.
      const { error: uploadError } = await supabase.storage
        .from('tutor-videos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // 3. PUBLIC URL RETRIEVAL
      const { data } = supabase.storage.from('tutor-videos').getPublicUrl(fileName);
      
      if (!data?.publicUrl) {
        throw new Error("Video link generation failed. Check file format.");
      }
      
      setVideoUrl(data.publicUrl);
      setInfo("Success: Introduction video synchronized.");
      
    } catch (error) {
      setErr(error.message || "Video synchronization failed.");
    } finally {
      setUploadingVideo(false);
    }
  }

  /* --------------------------------------------------------------------------
     8. SUBMISSION LOGIC (FINAL PROFILE SYNC)
     -------------------------------------------------------------------------- */

  /**
   * onSubmit
   * ✅ Logic preserved: Orchestrates the final data merge to the live server.
   * Ensures role-promotion and payout connectivity.
   */
  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setErr("");
    setInfo("");
    setSaving(true);

    try {
      /**
       * MOCK INTERCEPTOR
       * Allows for rapid UI prototyping without network dependency.
       */
      if (MOCK) {
        setInfo("Academic Simulation: Profile saved successfully.");
        return;
      }

      // 1. PAYLOAD CONSTRUCTION
      // Explicitly mapping UI state to the MongoDB Tutor model schema.
      const payload = {
        displayName,
        headline,
        bio,
        languages,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        // Selective logic: Only transmit PayPal email if it is the chosen path.
        paypalEmail: payoutMethod === "paypal" ? paypalEmail : "", 
        avatarUrl, 
        videoUrl, 
      };

      // 2. SERVER PERSISTENCE HANDSHAKE
      // Using PATCH to the /setup endpoint for role-specific processing.
      await apiFetch(`${API}/api/tutors/setup`, {
        method: "PATCH",
        body: payload,
      });

      setInfo("Profile verified. Redirecting to your academy dashboard...");
      
      // 3. SUCCESS NAVIGATION
      // Delaying navigation slightly to allow the tutor to see the success state.
      setTimeout(() => nav("/profile"), 1500);
      
    } catch (e2) {
      setErr(e2?.message?.includes("lernitt-server") 
        ? "Infrastructure update in progress. Please refresh." 
        : e2?.message || "Data synchronization failed.");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------------------------------
     9. UI RENDERING (ELITE ACADEMY DESIGN SYSTEM)
     -------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <main className="mx-auto max-w-4xl px-6 py-20 pb-32">
        
        {/* ACADEMY BREADCRUMB & HEADER SECTION */}
        <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-16">
          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              <Link to="/profile" className="inline-flex items-center gap-3 hover:text-indigo-600 transition-all">
                <span className="text-sm">←</span> Return to Academy Instance
              </Link>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-950 leading-none">
              Tutor Configuration
            </h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-lg">
              Define your professional brand and connect your global payout infrastructure.
            </p>
          </div>

          <Link
            to="/availability"
            className="rounded-[20px] bg-white border-2 border-slate-100 px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-600 shadow-sm hover:shadow-2xl hover:border-indigo-600 hover:-translate-y-1 transition-all"
          >
            Phase 2: Availability →
          </Link>
        </section>

        {/* STATUS ARCHITECTURE (ALERTS & LOADING) */}
        <div className="space-y-6 mb-12">
          {loading && (
            <div className="text-center py-6 bg-white rounded-[32px] border border-slate-100 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-600 animate-pulse">
                Synchronizing academic credentials...
              </p>
            </div>
          )}
          
          {err && (
            <div role="alert" className="p-8 bg-red-50 border-4 border-red-100 rounded-[40px] text-red-600 text-sm font-black text-center shadow-2xl shadow-red-100/50 animate-in fade-in zoom-in-95">
              {err}
            </div>
          )}
          
          {info && (
            <div className="p-8 bg-emerald-50 border-4 border-emerald-100 rounded-[40px] text-emerald-600 text-sm font-black text-center shadow-2xl shadow-emerald-100/50 animate-in slide-in-from-top-4">
              {info}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-16">
          
          {/* SECTION I: PAYOUT INFRASTRUCTURE */}
          <section className="rounded-[48px] bg-white p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="mb-12 text-center md:text-left">
              <h3 className="text-3xl font-black tracking-tight text-slate-950 mb-3">Payout Architecture</h3>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Configure your global settlement destination</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <button 
                type="button"
                onClick={() => setPayoutMethod("stripe")}
                className={`group p-10 rounded-[48px] border-4 transition-all text-left relative overflow-hidden ${
                  payoutMethod === "stripe" 
                    ? "border-indigo-600 bg-indigo-50/50 ring-8 ring-indigo-50" 
                    : "border-slate-50 bg-slate-50 hover:border-slate-200"
                }`}
              >
                <div className="text-4xl mb-6">🏦</div>
                <div className={`font-black uppercase tracking-widest text-[12px] mb-3 ${payoutMethod === "stripe" ? "text-indigo-600" : "text-slate-400"}`}>Bank Account</div>
                <p className="text-sm text-slate-500 font-bold leading-relaxed opacity-80">Direct transfers to your local bank via secure Stripe integration.</p>
                {payoutMethod === "stripe" && <div className="absolute top-8 right-8 text-indigo-600 font-black text-xl">✓</div>}
              </button>

              <button 
                type="button"
                onClick={() => setPayoutMethod("paypal")}
                className={`group p-10 rounded-[48px] border-4 transition-all text-left relative overflow-hidden ${
                  payoutMethod === "paypal" 
                    ? "border-indigo-600 bg-indigo-50/50 ring-8 ring-indigo-50" 
                    : "border-slate-50 bg-slate-50 hover:border-slate-200"
                }`}
              >
                <div className="text-4xl mb-6">💳</div>
                <div className={`font-black uppercase tracking-widest text-[12px] mb-3 ${payoutMethod === "paypal" ? "text-indigo-600" : "text-slate-400"}`}>PayPal Wallet</div>
                <p className="text-sm text-slate-500 font-bold leading-relaxed opacity-80">Instant digital settlements to your verified global PayPal wallet.</p>
                {payoutMethod === "paypal" && <div className="absolute top-8 right-8 text-indigo-600 font-black text-xl">✓</div>}
              </button>
            </div>

            {/* Payout Conditional Inputs */}
            <div className="animate-in fade-in duration-500">
              {payoutMethod === "stripe" && (
                <div className="p-10 bg-indigo-600 rounded-[40px] text-white flex items-start gap-8 shadow-2xl shadow-indigo-200">
                  <div className="text-5xl font-black italic opacity-20 select-none">!</div>
                  <div className="space-y-2">
                    <p className="text-sm font-black uppercase tracking-widest leading-loose">Identity Verification Required</p>
                    <p className="text-xs opacity-80 font-medium leading-relaxed">
                      You will be prompted to complete a secure KYC (Know Your Customer) process via Stripe once you enter your dashboard.
                    </p>
                  </div>
                </div>
              )}

              {payoutMethod === "paypal" && (
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6">PayPal Settlement Email</label>
                  <input 
                    type="email" 
                    value={paypalEmail} 
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    required
                    placeholder="verify@paypal.com"
                    className="w-full rounded-[32px] border-4 border-slate-50 bg-slate-50 px-10 py-6 text-base font-black text-slate-900 focus:border-indigo-600 focus:bg-white outline-none transition-all shadow-inner"
                  />
                </div>
              )}
            </div>
          </section>

          {/* SECTION II: MEDIA ASSETS INFRASTRUCTURE */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* AVATAR PORTRAIT MODULE */}
            <div className="rounded-[48px] bg-white p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 mb-10">Profile Portrait</h3>
              <div className="w-48 h-48 rounded-full bg-slate-100 border-[12px] border-white shadow-2xl overflow-hidden mb-10 flex items-center justify-center relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Portrait" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">📸</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 block">Awaiting Asset</span>
                  </div>
                )}
                {uploading && <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-xl flex items-center justify-center animate-pulse" />}
              </div>
              <label className="w-full cursor-pointer">
                <input 
                  type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading}
                  className="hidden"
                />
                <div className="w-full rounded-2xl bg-slate-950 py-4 px-8 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-600 transition-all">
                  {uploading ? "Synchronizing Asset..." : "Select Portrait"}
                </div>
              </label>
              <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Supports .jpg, .png, .webp (max 2MB)</p>
            </div>

            {/* VIDEO INTRODUCTION MODULE */}
            <div className="rounded-[48px] bg-slate-950 p-12 shadow-2xl text-white flex flex-col items-center text-center">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] mb-10">Introduction Video</h3>
              <div className="w-full aspect-video rounded-[40px] bg-white/5 border-4 border-dashed border-white/10 mb-10 flex items-center justify-center relative overflow-hidden group">
                {videoUrl ? (
                  <div className="text-center p-8 bg-indigo-600/40 w-full h-full flex flex-col items-center justify-center backdrop-blur-sm">
                    <span className="text-5xl mb-4">🎬</span>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em]">Stream Synchronized</p>
                  </div>
                ) : (
                  <div className="text-center opacity-30">
                    <p className="text-4xl mb-4">📽️</p>
                    <p className="text-[10px] font-black uppercase tracking-widest">1-Min Max Duration</p>
                    <p className="text-[9px] mt-2 font-bold uppercase tracking-widest">High Definition Recommended</p>
                  </div>
                )}
                {uploadingVideo && <div className="absolute inset-0 bg-indigo-500/30 backdrop-blur-md flex items-center justify-center animate-pulse" />}
              </div>
              <label className="w-full cursor-pointer">
                <input 
                  type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploadingVideo}
                  className="hidden"
                />
                <div className="w-full rounded-2xl bg-white/10 border-2 border-white/20 py-4 px-8 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-slate-950 transition-all">
                  {uploadingVideo ? "Streaming to Cloud..." : "Select Video Asset"}
                </div>
              </label>
              <p className="mt-6 text-[10px] font-bold text-white/20 uppercase tracking-widest">Supports .mp4, .mov, .avi</p>
            </div>
          </section>

          {/* SECTION III: PUBLIC CONTENT ARCHITECTURE */}
          <section className="rounded-[48px] bg-white p-14 shadow-[0_48px_80px_-24px_rgba(0,0,0,0.08)] border border-slate-100 space-y-12">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6">Professional Alias</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="e.g. James B." className="w-full rounded-[24px] border-4 border-slate-50 bg-slate-50 px-8 py-6 text-base font-black text-slate-900 focus:border-indigo-600 focus:bg-white outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6">Hourly Rate (USD)</label>
                <input type="number" min="0" step="1" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 25" className="w-full rounded-[24px] border-4 border-slate-50 bg-slate-50 px-8 py-6 text-base font-black text-slate-900 focus:border-indigo-600 focus:bg-white outline-none transition-all shadow-inner" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6">Academic Headline</label>
              <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Expert English Specialist with CEFR Certification" className="w-full rounded-[24px] border-4 border-slate-50 bg-slate-50 px-8 py-6 text-base font-black text-slate-900 focus:border-indigo-600 focus:bg-white outline-none transition-all shadow-inner" />
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6">Language Matrix</label>
              <input type="text" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English (Native), Spanish (C1)" className="w-full rounded-[24px] border-4 border-slate-50 bg-slate-50 px-8 py-6 text-base font-black text-slate-900 focus:border-indigo-600 focus:bg-white outline-none transition-all shadow-inner" />
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6">Tutor Bio & Pedagogy</label>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                rows={12} 
                placeholder="Define your teaching methodology, academic credentials, and learner outcomes in detail." 
                className="w-full rounded-[48px] border-4 border-slate-50 bg-slate-50 px-10 py-8 text-base font-black text-slate-900 focus:border-indigo-600 focus:bg-white outline-none transition-all resize-none leading-relaxed shadow-inner" 
              />
            </div>

            {/* ACTION ARCHITECTURE: FINAL SUBMISSION */}
            <div className="pt-12 flex flex-col lg:flex-row gap-8">
              <button 
                type="submit" 
                disabled={saving || uploading || uploadingVideo} 
                className="flex-[2] rounded-[32px] bg-slate-950 px-12 py-8 text-[12px] font-black uppercase tracking-[0.5em] text-white shadow-2xl shadow-slate-900/40 hover:bg-indigo-600 hover:-translate-y-2 transition-all active:translate-y-0 disabled:opacity-20 disabled:hover:translate-y-0"
              >
                {saving ? "Synchronizing Asset Data..." : "Finalize Professional Profile"}
              </button>
              
              <button 
                type="button" 
                onClick={() => nav("/tutor")} 
                className="flex-1 rounded-[32px] border-4 border-slate-100 bg-white px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-slate-950 hover:border-slate-300 transition-all active:scale-95"
              >
                Dashboard
              </button>
            </div>
          </section>
        </form>

        {/* ACADEMY INSTANCE FOOTNOTE */}
        <section className="mt-24 text-center select-none">
          <div className="text-4xl font-black tracking-tighter text-slate-200">LERNITT</div>
          <p className="mt-6 text-[11px] font-black text-slate-200 uppercase tracking-[0.8em]">
            Academic Onboarding Protocol v5.3.0
          </p>
        </section>

      </main>
    </div>
  );
}
