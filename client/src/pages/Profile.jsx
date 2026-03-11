// client/src/pages/Profile.jsx
// -----------------------------------------------------------------------------
// Version 7.1.0 - USD GLOBAL LOCKDOWN (FIXED PLUMBING & ROLE MERGE)
// - MERGED: Triple Badge View, DNA Dashboard, and AI insights.
// - MERGED: Master Syllabus Checklist (80+ potential roadmap items).
// - MERGED: 10-lesson pedagogical retake lock.
// - FIXED: Blank screen crash by adding role-based conditional rendering for Tutors.
// - ADDED: Tutor Professional Suite for instructor users.
// - INTEGRATED: USD ($) currency symbols for tutor hourly rates.
// - MANDATORY: No truncation. This is the complete file.
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { supabase } from "../lib/supabaseClient";

const MOCK = import.meta.env.VITE_MOCK === "1";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
      {hint && <div className="text-xs opacity-70 mt-1">{hint}</div>}
    </label>
  );
}

function InfoRow({ k, v, mono }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <div className="w-32 text-sm opacity-70">{k}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{v ?? "—"}</div>
    </div>
  );
}

export default function Profile() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [me, setMe] = useState(null); // raw server "me"
  const [profile, setProfile] = useState({
    displayName: "",
    bio: "",
    languages: "",
    location: "",
    photoUrl: "",
  });

  // State for the 10-lesson pedagogical lock
  const [completedLessonCount, setCompletedLessonCount] = useState(0);

  const [dirty, setDirty] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const fileRef = useRef(null);

  const verified = !!me?.emailVerified || !!me?.verified;
  const role = me?.role || "student";

  // Retake Logic constants
  const REQUIRED_LESSONS_FOR_RETAKE = 10;
  const lessonsRemaining = Math.max(0, REQUIRED_LESSONS_FOR_RETAKE - completedLessonCount);
  const canRetake = role === "student" && (completedLessonCount >= REQUIRED_LESSONS_FOR_RETAKE || !me?.proficiencyLevel || me?.proficiencyLevel === "none");

  function markDirty(patch) {
    setProfile((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      let base = null;
      try {
        base = await apiFetch("/api/me", { auth: true });
      } catch {
        base = await apiFetch("/api/user/me", { auth: true });
      }

      let prof = null;
      try {
        prof = await apiFetch("/api/profile", { auth: true });
      } catch {
        prof = {};
      }

      // Fetch completed lessons count for retake logic
      try {
        const lessons = await apiFetch("/api/lessons/mine", { auth: true });
        const completed = (Array.isArray(lessons) ? lessons : []).filter(l => l.status === 'completed').length;
        setCompletedLessonCount(completed);
      } catch (lessonErr) {
        console.warn("Could not fetch lessons for DNA lock:", lessonErr);
        setCompletedLessonCount(0);
      }

      if (!base?._id && !MOCK) {
        const next = encodeURIComponent("/profile");
        nav(`/login?next=${next}`, { replace: true });
        return;
      }

      if (MOCK && !base?._id) {
        base = {
          _id: "mock-user-id",
          email: "student@example.com",
          emailVerified: true,
          role: "student",
          createdAt: new Date().toISOString(),
          proficiencyLevel: "B1",
          placementTest: {
            scores: { written: "B2", speaking: "B1", overall: "B1" },
            insights: "Excellent structural foundation; focus needed on spoken conditional nuances."
          },
          grammarWeaknesses: [
            { category: "B1", component: "Present Perfect vs Past Simple" },
            { category: "B2", component: "Third Conditional" }
          ]
        };
      }
      if (MOCK && !prof?.displayName) {
        prof = {
          displayName: "Alex Student",
          bio: "Loves languages. Learning English for travel.",
          languages: "English (B1), Spanish (A2)",
          location: "Madrid, ES",
          photoUrl: "",
        };
      }

      setMe(base);
      setProfile({
        displayName: prof.displayName || base.name || "",
        bio: prof.bio || base.bio || "",
        languages: Array.isArray(base.languages) ? base.languages.join(", ") : (prof.languages || ""),
        location: prof.location || base.country || "",
        photoUrl: prof.photoUrl || base.avatar || "",
      });
      setDirty(false);
    } catch (e) {
      setErr(e.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      if (MOCK) {
        localStorage.setItem("mock:profile", JSON.stringify(profile));
      } else {
        await apiFetch("/api/profile", {
          method: "PUT",
          auth: true,
          body: profile,
        });
      }
      setDirty(false);
      setMsg("Profile saved!");
    } catch (e) {
      setErr(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadAvatar(file) {
    if (!file) return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      if (MOCK) {
        const reader = new FileReader();
        reader.onload = () => {
          setProfile((p) => ({ ...p, photoUrl: reader.result }));
          setDirty(true);
          setMsg("Avatar updated (mock).");
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("You must be logged in to upload.");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tutor-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tutor-avatars')
        .getPublicUrl(fileName);

      setProfile((p) => ({ ...p, photoUrl: publicUrl }));
      setDirty(true);
      setMsg("Avatar uploaded.");
    } catch (e) {
      setErr(e.message || "Avatar upload failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onSendVerify() {
    setVerifyBusy(true);
    setErr("");
    setMsg("");
    try {
      if (MOCK) {
        setMsg("Verification email sent (mock).");
      } else {
        let ok = false;
        const endpoints = [
          "/api/auth/verify/send",
          "/api/verify/send",
          "/api/users/verify/send",
        ];
        for (const ep of endpoints) {
          try {
            const r = await apiFetch(ep, { method: "POST", auth: true, body: {} });
            if (r) ok = true;
            break;
          } catch {}
        }
        if (!ok) throw new Error("Could not send verification.");
        setMsg("Verification email sent.");
      }
    } catch (e) {
      setErr(e.message || "Failed to send verification.");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setPwdBusy(true);
    setErr("");
    setMsg("");
    try {
      if (pwd.next.length < 8) throw new Error("New password must be at least 8 characters.");
      if (pwd.next !== pwd.confirm) throw new Error("Passwords do not match.");
      if (MOCK) {
        setMsg("Password changed (mock).");
      } else {
        await apiFetch("/api/auth/change-password", {
          method: "POST",
          auth: true,
          body: { current: pwd.current, next: pwd.next },
        });
        setMsg("Password changed.");
      }
      setPwd({ current: "", next: "", confirm: "" });
    } catch (e) {
      setErr(e.message || "Password change failed.");
    } finally {
      setPwdBusy(false);
    }
  }

  async function onDeleteAccount() {
    if (!confirm("Delete your account permanently? This cannot be undone.")) return;
    setErr("");
    setMsg("");
    try {
      if (MOCK) {
        localStorage.clear();
      } else {
        await apiFetch("/api/me", { method: "DELETE", auth: true });
      }
      setMsg("Account deleted.");
      setTimeout(() => {
        localStorage.removeItem("token");
        nav("/signup");
      }, 600);
    } catch (e) {
      setErr(e.message || "Delete failed.");
    }
  }

  const profileLink = useMemo(() => {
    if (role === "tutor") return `/tutors/${encodeURIComponent(me?._id || "me")}`;
    return `/profile`;
  }, [role, me?._id]);

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="border rounded-[32px] h-64 bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="flex gap-2">
          <Link to={role === "tutor" ? "/availability" : "/my-lessons"} className="text-sm underline">
            ← {role === "tutor" ? "Availability" : "My Lessons"}
          </Link>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.origin + profileLink);
                alert("Profile link copied!");
              } catch {
                alert("Copy failed");
              }
            }}
            className="text-xs border px-2 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            Copy profile link
          </button>
        </div>
      </div>

      {!verified && (
        <div className="rounded-2xl p-3" style={{ background: "#fef9c3", border: "1px solid #facc15" }}>
          <div className="text-sm">
            Please verify your email to unlock all features.
            <button className="ml-3 border px-3 py-1 rounded-2xl text-sm" onClick={onSendVerify} disabled={verifyBusy}>
              {verifyBusy ? "Sending…" : "Send verification email"}
            </button>
          </div>
        </div>
      )}

      {/* 🧬 DUAL-CORE LINGUISTIC DNA DASHBOARD (STUDENT ONLY) */}
      {role === "student" && (
        <div className="border rounded-[32px] p-8 shadow-xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white border-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-1">Academic Diagnostic</div>
              <h2 className="text-3xl font-black tracking-tight">Your Linguistic DNA</h2>
            </div>
            
            <div className="flex gap-3">
               <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 min-w-[70px]">
                  <div className="text-[8px] font-bold text-white/50 uppercase">Written</div>
                  <div className="text-lg font-black">{me?.placementTest?.scores?.written || "N/A"}</div>
               </div>
               <div className="text-center bg-indigo-500 rounded-2xl p-3 shadow-lg ring-4 ring-indigo-500/20 min-w-[80px]">
                  <div className="text-[8px] font-bold text-white/80 uppercase">Integrated</div>
                  <div className="text-2xl font-black">{me?.proficiencyLevel || "N/A"}</div>
               </div>
               <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 min-w-[70px]">
                  <div className="text-[8px] font-bold text-white/50 uppercase">Speaking</div>
                  <div className="text-lg font-black">{me?.placementTest?.scores?.speaking || "N/A"}</div>
               </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/10">
             <div className="text-[9px] font-black uppercase text-indigo-300 mb-1">AI Academy Insight</div>
             <p className="text-sm italic text-indigo-50/80 leading-relaxed">
               "{me?.placementTest?.insights || "No diagnostic summary available yet."}"
             </p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-3">Mastery Checklist (Academic Gaps)</div>
              {me?.grammarWeaknesses && me.grammarWeaknesses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {me.grammarWeaknesses.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/5">
                      <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-black">!</div>
                      <div>
                        <div className="text-xs font-bold">{w.component}</div>
                        <div className="text-[8px] uppercase opacity-50 font-bold">{w.category} Syllabus</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/40 italic">Diagnostic data pending.</div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <Link 
                to={canRetake ? "/placement-test" : "#"}
                className={`w-full inline-flex items-center justify-center rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all ${
                  canRetake 
                  ? 'bg-white text-indigo-900 shadow-xl hover:bg-indigo-50 hover:-translate-y-0.5' 
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
                onClick={(e) => !canRetake && e.preventDefault()}
              >
                {canRetake ? "Retake Professional Assessment" : "Assessment Locked"}
              </Link>
              {!canRetake && me?.proficiencyLevel !== "none" && (
                <p className="text-[9px] text-center mt-3 text-white/40 font-bold uppercase tracking-wider">
                  🔒 Complete {lessonsRemaining} more lesson{lessonsRemaining !== 1 ? 's' : ''} to unlock your next diagnostic.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎓 TUTOR PROFESSIONAL SUITE (TUTOR ONLY) */}
      {role === "tutor" && (
        <div className="border rounded-[32px] p-8 shadow-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Instructor Profile</div>
              <h2 className="text-3xl font-black tracking-tight">Professional Suite</h2>
            </div>
            <div className="bg-emerald-500 rounded-2xl p-3 text-center min-w-[100px]">
              <div className="text-[8px] font-bold text-white/80 uppercase">Hourly Rate</div>
              <div className="text-2xl font-black">${me?.hourlyRate || me?.price || "0"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Status</div>
              <div className="text-sm font-bold capitalize">{me?.tutorStatus || "Pending"}</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Total Lessons</div>
              <div className="text-sm font-bold">{me?.totalLessons || 0}</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Earnings</div>
              <div className="text-sm font-bold">${(me?.totalEarnings || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <Link to="/availability" className="flex-1 text-center bg-white text-slate-900 rounded-2xl py-3 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition">
              Manage Matrix
            </Link>
            <Link to="/payouts" className="flex-1 text-center bg-indigo-600 text-white rounded-2xl py-3 text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition">
              Wallet Settings
            </Link>
          </div>
        </div>
      )}

      {/* PROFILE EDITING SECTION */}
      <div className="border rounded-2xl p-4 shadow-sm bg-white">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border overflow-hidden bg-gray-50 flex items-center justify-center text-slate-400">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold">{(profile.displayName || me?.email || "?").slice(0, 1)}</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-slate-900">{profile.displayName || "Update your name"}</div>
            <div className="text-xs opacity-70">{me?.email || "—"}</div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUploadAvatar(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition">
              Change photo
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 mt-4">
          <Field label="Display name">
            <input value={profile.displayName} onChange={(e) => markDirty({ displayName: e.target.value })} className="border rounded-xl px-3 py-2 w-full" placeholder="How should we show your name?" />
          </Field>
          <Field label="Location" hint="City, Country (optional)">
            <input value={profile.location} onChange={(e) => markDirty({ location: e.target.value })} className="border rounded-xl px-3 py-2 w-full" placeholder="e.g. Madrid, ES" />
          </Field>
          <Field label="Languages" hint="Comma separated, levels welcome">
            <input value={profile.languages} onChange={(e) => markDirty({ languages: e.target.value })} className="border rounded-xl px-3 py-2 w-full" placeholder="English (B2), Spanish (A2)…" />
          </Field>
          <div />
          <Field label="Bio">
            <textarea value={profile.bio} onChange={(e) => markDirty({ bio: e.target.value })} className="border rounded-xl px-3 py-2 w-full min-h-[96px]" placeholder="Tell students a bit about yourself…" />
          </Field>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={onSave} disabled={saving || !dirty} className="border px-4 py-2 rounded-2xl text-sm font-bold bg-slate-900 text-white disabled:opacity-60 transition shadow-lg active:scale-95">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {msg && <span className="text-sm text-green-700 self-center font-bold">{msg}</span>}
          {err && <span className="text-sm text-red-600 self-center font-bold">{err}</span>}
        </div>
      </div>

      {/* ACCOUNT DETAILS */}
      <div className="border rounded-2xl p-4 shadow-sm bg-white">
        <div className="text-lg font-semibold mb-2">Account</div>
        <InfoRow k="Email" v={me?.email} mono />
        <InfoRow k="Role" v={role} />
        <InfoRow k="Verified" v={verified ? "Yes" : "No"} />
        <InfoRow k="Joined" v={me?.createdAt ? new Date(me.createdAt).toLocaleString() : "—"} />
      </div>

      {/* PASSWORD SECTION */}
      <div className="border rounded-2xl p-4 shadow-sm bg-white">
        <div className="text-lg font-semibold mb-2">Change password</div>
        <form onSubmit={onChangePassword} className="grid gap-2 md:grid-cols-2">
          <Field label="Current password">
            <input type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} className="border rounded-xl px-3 py-2 w-full" autoComplete="current-password" required />
          </Field>
          <div />
          <Field label="New password">
            <input type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} className="border rounded-xl px-3 py-2 w-full" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} className="border rounded-xl px-3 py-2 w-full" autoComplete="new-password" required minLength={8} />
          </Field>
          <div className="md:col-span-2 flex gap-2 mt-1">
            <button type="submit" disabled={pwdBusy} className="border px-3 py-1 rounded-2xl text-sm shadow-sm hover:shadow-md transition disabled:opacity-60 font-bold">
              {pwdBusy ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>

      {role === "tutor" && (
        <div className="border rounded-2xl p-4 shadow-sm bg-white">
          <div className="text-lg font-semibold mb-2">Payouts & identity</div>
          <div className="text-sm opacity-80 mb-2">
            Manage payouts and verification in{" "}
            <Link to="/payouts" className="underline">Payouts</Link>.
          </div>
        </div>
      )}

      {/* DANGER ZONE */}
      <div className="border rounded-2xl p-4 shadow-sm bg-red-50 border-red-100">
        <div className="text-lg font-bold text-red-900 mb-2">Danger zone</div>
        <button onClick={onDeleteAccount} className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition bg-white" style={{ borderColor: "#fecaca", color: "#991b1b" }}>
          Delete account
        </button>
      </div>
    </div>
  );
}
