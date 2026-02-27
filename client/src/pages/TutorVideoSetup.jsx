// /client/src/pages/TutorVideoSetup.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { supabase } from "../lib/supabaseClient"; 

/**
 * LERNITT ACADEMY - SOPHISTICATED VIDEO UPLOAD v1.0.0
 * ----------------------------------------------------------------------------
 * This page allows tutors to select and upload a pre-recorded video file 
 * from their local device to the 'tutor-videos' Supabase bucket.
 * ----------------------------------------------------------------------------
 */

const API = "https://lernitt.onrender.com";

export default function TutorVideoSetup() {
  const nav = useNavigate();
  const { user, login, getToken } = useAuth();

  const [videoUrl, setVideoUrl] = useState(user?.introVideo || "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // Guard: only tutors should access this onboarding step
  useEffect(() => {
    if (!user) return;
    if (user.role !== "tutor") nav("/", { replace: true });
  }, [user, nav]);

  /**
   * HANDLER: PRE-RECORDED FILE UPLOAD
   * Uses the same successful 'Handshake' logic that fixed the profile photos.
   */
  async function handleVideoUpload(e) {
    try {
      setUploading(true);
      setErr("");
      setInfo("");
      setProgress(5);

      const file = e.target.files[0];
      if (!file) return;

      // Senior Developer Check: Ensure the file is a video and under the 50MB limit
      if (!file.type.startsWith('video/')) {
        throw new Error("Please select a valid video file (MP4, MOV, etc.).");
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error("This file is too large. Please keep your intro video under 50MB.");
      }

      // 1. Generate unique flat filename to prevent browser cache issues
      const fileExt = file.name.split('.').pop();
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `promo-${user.id}-${Date.now()}-${uniqueSuffix}.${fileExt}`;

      // 2. Upload to lowercase 'tutor-videos' bucket (Security verified via SQL)
      const { error: uploadError } = await supabase.storage
        .from('tutor-videos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;
      setProgress(85);

      // 3. Retrieve the permanent public link
      const { data } = supabase.storage.from('tutor-videos').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      // 4. Update the Tutor's database record via the server
      const token = getToken();
      const updatedUser = await apiFetch(`${API}/api/profile`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ introVideo: publicUrl })
      });

      // Update local session to reflect the new video
      login(token, updatedUser);
      setVideoUrl(publicUrl);
      setProgress(100);
      setInfo("Success! Your promotional video has been uploaded and linked to your profile.");
    } catch (error) {
      setErr(error.message || "An error occurred during the video handshake.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 850, margin: "40px auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div className="space-y-1">
          <div className="text-xs text-slate-500">
            <Link to="/tutor" className="inline-flex items-center gap-1 hover:underline">
              ← Back to tutor dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em" }}>Introduction Video</h1>
          <p style={{ color: "#64748b", fontSize: 16 }}>Select a pre-recorded video file from your device to show students your teaching style.</p>
        </div>
      </div>

      {/* VIDEO PREVIEW & UPLOAD AREA */}
      <div style={{ 
        background: "#f8fafc", 
        borderRadius: 32, 
        border: "2px dashed #e2e8f0", 
        padding: 50, 
        textAlign: "center" 
      }}>
        {videoUrl ? (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ 
              borderRadius: 24, 
              overflow: "hidden", 
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", 
              background: "black", 
              aspectRatio: "16/9" 
            }}>
              <video src={videoUrl} controls style={{ width: "100%", height: "100%" }} />
            </div>
            <button 
              onClick={() => setVideoUrl("")}
              style={{ marginTop: 20, color: "#ef4444", background: "none", border: "none", fontWeight: 700, cursor: "pointer" }}
            >
              ← Remove and select a different file
            </button>
          </div>
        ) : (
          <div style={{ padding: "40px 0" }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>🎬</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>Upload Your Promo Video</h2>
            <p style={{ color: "#64748b", marginBottom: 30, maxWidth: 450, margin: "0 auto 30px" }}>
              Choose an MP4 or MOV file. Make sure you are in a well-lit area and your audio is clear.
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

      {/* PROGRESS BAR (Only visible during active sync) */}
      {uploading && (
        <div style={{ marginTop: 24, width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#4f46e5", transition: "width 0.3s ease" }} />
        </div>
      )}

      {/* FEEDBACK NOTIFICATIONS */}
      {err && (
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          background: "#fef2f2", 
          color: "#b91c1c", 
          borderRadius: 16, 
          fontWeight: 600, 
          border: "1px solid #fee2e2" 
        }}>
          {err}
        </div>
      )}
      {info && (
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          background: "#f0fdf4", 
          color: "#166534", 
          borderRadius: 16, 
          fontWeight: 600, 
          border: "1px solid #dcfce7" 
        }}>
          {info}
        </div>
      )}

      {/* NAVIGATION FOOTER */}
      <div style={{ 
        marginTop: 40, 
        borderTop: "1px solid #f1f5f9", 
        paddingTop: 30, 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center" 
      }}>
        <p style={{ fontSize: 14, color: "#94a3b8" }}>
          Need tips on what to say? View our <span style={{ color: "#4f46e5", cursor: "pointer" }}>Promotion Guide</span>.
        </p>
        <button 
          onClick={() => nav("/availability")}
          disabled={!videoUrl || uploading}
          style={{ 
            padding: "16px 48px", borderRadius: 20, background: videoUrl ? "#0f172a" : "#cbd5e1", 
            color: "white", fontWeight: 800, border: "none", cursor: videoUrl ? "pointer" : "not-allowed", transition: "0.2s" 
          }}
        >
          Proceed to Availability →
        </button>
      </div>
    </div>
  );
}
