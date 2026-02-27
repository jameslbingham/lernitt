// /client/src/pages/TutorVideoSetup.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { supabase } from "../lib/supabaseClient"; 

// FIXED: Pointing to the live integrated service
const API = "https://lernitt.onrender.com";

export default function TutorVideoSetup() {
  const nav = useNavigate();
  const { user, login, getToken } = useAuth();

  const [videoUrl, setVideoUrl] = useState(user?.introVideo || "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // Guard: only tutors should access this page
  useEffect(() => {
    if (!user) return;
    if (user.role !== "tutor") nav("/", { replace: true });
  }, [user, nav]);

  // --- 🛠️ SOPHISTICATED UPLOAD LOGIC ---
  async function handleVideoUpload(e) {
    try {
      setUploading(true);
      setErr("");
      setInfo("");
      setProgress(5);

      const file = e.target.files[0];
      if (!file) return;

      // 1. Sophisticated Guard: Check file size (Supabase Free Tier limit is 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("Video is too large. Please keep it under 50MB for optimal student streaming.");
      }

      // 2. Generate unique filename (Flat Path logic to avoid security errors)
      const fileExt = file.name.split('.').pop();
      const fileName = `intro-${user.id}-${Date.now()}.${fileExt}`;

      // 3. Upload to lowercase 'tutor-videos' bucket
      const { error: uploadError } = await supabase.storage
        .from('tutor-videos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;
      setProgress(85);

      // 4. Retrieve the link
      const { data } = supabase.storage.from('tutor-videos').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      // 5. Save to MongoDB
      const token = getToken();
      const updatedUser = await apiFetch(`/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ introVideo: publicUrl })
      });

      // Update local session
      login(token, updatedUser);
      setVideoUrl(publicUrl);
      setProgress(100);
      setInfo("Sophisticated! Your introduction video has been synced to your profile.");
    } catch (error) {
      setErr(error.message || "Failed to upload video. Please check bucket permissions.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 850, margin: "40px auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em" }}>Introduction Video</h1>
          <p style={{ color: "#64748b", fontSize: 16 }}>First impressions matter. Help students choose you by showing your energy.</p>
        </div>
        <Link to="/tutor" style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5", textDecoration: "none" }}>Dashboard</Link>
      </div>

      <div style={{ background: "#f8fafc", borderRadius: 32, border: "2px dashed #e2e8f0", padding: 50, textAlign: "center", position: "relative" }}>
        {videoUrl ? (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", background: "black", aspectRatio: "16/9" }}>
              <video src={videoUrl} controls style={{ width: "100%", height: "100%" }} />
            </div>
            <button 
              onClick={() => setVideoUrl("")}
              style={{ marginTop: 20, color: "#ef4444", background: "none", border: "none", fontWeight: 700, cursor: "pointer" }}
            >
              ← Delete and upload a better version
            </button>
          </div>
        ) : (
          <div style={{ padding: "40px 0" }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>🎬</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>Record or Upload Your Intro</h2>
            <p style={{ color: "#64748b", marginBottom: 30, maxWidth: 400, margin: "0 auto 30px" }}>
              Keep it under 2 minutes. Speak clearly and mention your teaching philosophy.
            </p>
            
            <label style={{ 
              background: "#4f46e5", color: "white", padding: "16px 40px", borderRadius: 20, fontWeight: 800, 
              cursor: "pointer", display: "inline-block", boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)" 
            }}>
              {uploading ? `Syncing... ${progress}%` : "Select Video File"}
              <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoUpload} disabled={uploading} />
            </label>
          </div>
        )}
      </div>

      {uploading && (
        <div style={{ marginTop: 24, width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#4f46e5", transition: "width 0.3s ease" }} />
        </div>
      )}

      {err && <div style={{ marginTop: 20, padding: 16, background: "#fef2f2", color: "#b91c1c", borderRadius: 16, fontWeight: 600, border: "1px solid #fee2e2" }}>{err}</div>}
      {info && <div style={{ marginTop: 20, padding: 16, background: "#f0fdf4", color: "#166534", borderRadius: 16, fontWeight: 600, border: "1px solid #dcfce7" }}>{info}</div>}

      <div style={{ marginTop: 40, borderTop: "1px solid #f1f5f9", paddingTop: 30, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 14, color: "#94a3b8" }}>Need tips on recording? Check our <a href="#" style={{ color: "#4f46e5" }}>Tutor Handbook</a>.</p>
        <button 
          onClick={() => nav("/availability")}
          disabled={!videoUrl || uploading}
          style={{ 
            padding: "16px 48px", borderRadius: 20, background: videoUrl ? "#0f172a" : "#cbd5e1", 
            color: "white", fontWeight: 800, border: "none", cursor: videoUrl ? "pointer" : "not-allowed", transition: "0.2s" 
          }}
        >
          Finish Onboarding →
        </button>
      </div>
    </div>
  );
}
