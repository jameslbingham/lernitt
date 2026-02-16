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

  const [dirty, setDirty] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const fileRef = useRef(null);

  const verified = !!me?.emailVerified;
  const role = me?.role || "student";

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
        displayName: prof.displayName || "",
        bio: prof.bio || "",
        languages: prof.languages || "",
        location: prof.location || "",
        photoUrl: prof.photoUrl || "",
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

      // Professional Supabase Integration
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("You must be logged in to upload.");

      // 2. Define Flat Path to Match Simplified Policy
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // 3. Direct Storage Transfer (No public/ prefix)
      const { error: uploadError } = await supabase.storage
        .from('tutor-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 4. Retrieve Public URL
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
        <div className="border rounded-2xl p-3 space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-64 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded" />
        </div>
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

      <div className="border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border overflow-hidden bg-gray-50 flex items-center justify-center">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">{(profile.displayName || me?.email || "?").slice(0, 1)}</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold">{profile.displayName || "Your name"}</div>
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
          <button onClick={onSave} disabled={saving || !dirty} className="border px-3 py-1 rounded-2xl text-sm shadow-sm hover:shadow-md transition disabled:opacity-60">
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          {msg && <span className="text-sm text-green-700">{msg}</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      <div className="border rounded-2xl p-4 shadow-sm">
        <div className="text-lg font-semibold mb-2">Account</div>
        <InfoRow k="Email" v={me?.email} mono />
        <InfoRow k="Role" v={role} />
        <InfoRow k="Verified" v={verified ? "Yes" : "No"} />
        <InfoRow k="Joined" v={me?.createdAt ? new Date(me.createdAt).toLocaleString() : "—"} />
      </div>

      <div className="border rounded-2xl p-4 shadow-sm">
        <div className="text-lg font-semibold mb-2">Change password</div>
        <form onSubmit={onChangePassword} className="grid gap-2 md:grid-cols-2">
          <Field label="Current password">
            <input type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} className="border rounded-xl px-3 py-2 w-full" autoComplete="current-password" required />
          </Field>
          <div />
          <Field label="New password">
            <input type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} className="border rounded-xl px-3 py-2 w-full" autoComplete
