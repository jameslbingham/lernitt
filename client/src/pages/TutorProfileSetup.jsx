// /client/src/pages/TutorProfileSetup.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { supabase } from "../lib/supabaseClient"; 

const API = "https://lernitt.onrender.com";
const MOCK = import.meta.env.VITE_MOCK === "1";

export default function TutorProfileSetup() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  
  // ✅ ENHANCED: Payout Selection with Stripe Redirect Notice
  const [payoutMethod, setPayoutMethod] = useState("stripe");
  const [paypalEmail, setPaypalEmail] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "tutor") {
      nav("/", { replace: true });
    }
  }, [user, nav]);

  useEffect(() => {
    if (MOCK) return;
    let cancelled = false;
    async function loadProfile() {
      setLoading(true);
      try {
        const data = await apiFetch(`${API}/api/tutors/setup`, { method: "GET" });
        if (!data || cancelled) return;
        if (data.displayName) setDisplayName(data.displayName);
        if (data.headline) setHeadline(data.headline);
        if (data.bio) setBio(data.bio);
        if (data.languages) setLanguages(data.languages);
        if (data.hourlyRate != null) setHourlyRate(String(data.hourlyRate));
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.paypalEmail) {
          setPaypalEmail(data.paypalEmail);
          setPayoutMethod("paypal");
        }
      } catch (e) {
        console.warn("Profile load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  async function handleFileUpload(e) {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file || !user?.id) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('tutor-avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('tutor-avatars').getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      setInfo("Photo uploaded successfully!");
    } catch (error) {
      setErr("Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        displayName,
        headline,
        bio,
        languages,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        paypalEmail: payoutMethod === "paypal" ? paypalEmail : "",
        avatarUrl, 
      };

      await apiFetch(`${API}/api/tutors/setup`, {
        method: "PATCH",
        body: payload,
      });

      setInfo("Success! Your professional profile has been created.");
      setTimeout(() => nav("/tutor"), 1500);
    } catch (e2) {
      setErr(e2?.message || "Could not save your details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Tutor Professional Setup</h1>
        <p style={{ color: "#64748b" }}>Choose your payout preference and finalize your academic profile.</p>
      </header>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 24 }}>
        
        {/* --- PAYOUT METHOD SELECTION --- */}
        <section style={{ padding: 24, background: "#f8fafc", borderRadius: 24, border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>💰 Payout Preferences</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button 
              type="button"
              onClick={() => setPayoutMethod("stripe")}
              style={{
                padding: 16, borderRadius: 16, border: "2px solid", cursor: "pointer", transition: "0.2s",
                borderColor: payoutMethod === "stripe" ? "#4f46e5" : "#e2e8f0",
                background: payoutMethod === "stripe" ? "#eff6ff" : "white", textAlign: "left"
              }}
            >
              <div style={{ fontSize: 18 }}>🏦</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>Bank Account</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Secure Transfer via Stripe</div>
            </button>

            <button 
              type="button"
              onClick={() => setPayoutMethod("paypal")}
              style={{
                padding: 16, borderRadius: 16, border: "2px solid", cursor: "pointer", transition: "0.2s",
                borderColor: payoutMethod === "paypal" ? "#4f46e5" : "#e2e8f0",
                background: payoutMethod === "paypal" ? "#eff6ff" : "white", textAlign: "left"
              }}
            >
              <div style={{ fontSize: 18 }}>💳</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>PayPal</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Instant Digital Payout</div>
            </button>
          </div>

          {/* STRIPE CLARITY BOX */}
          {payoutMethod === "stripe" && (
            <div style={{ marginTop: 20, padding: 16, background: "#fff", borderRadius: 16, border: "1px solid #4f46e5", display: "flex", gap: 12 }}>
              <span style={{ fontSize: 20 }}>ℹ️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>Third-Party Verification Required</p>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: "#475569" }}>
                  To receive payments to your bank account, you will be redirected to **Stripe** (our secure payment partner) from your dashboard to provide your banking details safely.
                </p>
              </div>
            </div>
          )}

          {payoutMethod === "paypal" && (
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Enter your PayPal Email</label>
              <input 
                type="email" 
                value={paypalEmail} 
                onChange={(e) => setPaypalEmail(e.target.value)}
                required
                placeholder="email@example.com"
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #cbd5e1", marginTop: 6 }}
              />
            </div>
          )}
        </section>

        {/* --- PROFILE BASICS --- */}
        <div style={{ textAlign: "center", padding: 24, background: "#f1f5f9", borderRadius: 24, border: "2px dashed #cbd5e1" }}>
           <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#cbd5e1", margin: "0 auto 12px", overflow: "hidden", border: "4px solid white", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
             {avatarUrl && <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
           </div>
           <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} style={{ fontSize: 12 }} />
           {uploading && <p style={{ color: "#4f46e5", fontSize: 11, fontWeight: "bold", marginTop: 8 }}>Uploading to Academy Servers...</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Public Display Name</span>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} required style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #cbd5e1", marginTop: 4 }} />
          </label>
          <label>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Hourly Rate (USD)</span>
            <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} required style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #cbd5e1", marginTop: 4 }} />
          </label>
        </div>

        <label>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Professional Headline</span>
          <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Certified IELTS Instructor" style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #cbd5e1", marginTop: 4 }} />
        </label>

        <label>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tutor Biography</span>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5} placeholder="Describe your teaching style..." style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #cbd5e1", marginTop: 4, resize: "none" }} />
        </label>

        <button 
          type="submit" 
          disabled={saving || uploading}
          style={{ 
            background: "#4f46e5", color: "white", padding: "20px", borderRadius: "20px", border: "none", 
            fontWeight: 800, fontSize: 16, cursor: "pointer", transition: "transform 0.1s active",
            boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)"
          }}
        >
          {saving ? "Processing Academy Profile..." : "Save and Go to Dashboard"}
        </button>
      </form>
    </div>
  );
}
