// /client/src/pages/LessonRecordings.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function LessonRecordings() {
  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

  const { getToken } = useAuth();
  const token = getToken();
  const API = import.meta.env.VITE_API;

  const [loading, setLoading] = useState(true);
  const [recordings, setRecordings] = useState([]);

  useEffect(() => {
    async function loadRecs() {
      try {
        const res = await fetch(
          `${API}/api/video/recordings/${lessonId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setRecordings(data.recordings || []);
      } catch (err) {
        console.error("recordings error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (lessonId) loadRecs();
  }, [lessonId, API, token]);

  if (loading) return <p style={{ padding: 20 }}>Loading recordings…</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>Lesson Recordings</h2>

      {recordings.length === 0 && (
        <p>No recordings found for this lesson.</p>
      )}

      {recordings.map((rec) => (
        <div
          key={rec.id}
          style={{
            border: "1px solid #ddd",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
            background: "#fafafa",
          }}
        >
          <p><strong>ID:</strong> {rec.id}</p>
          <p><strong>Status:</strong> {rec.status}</p>

          {rec.download_url ? (
            <a
              href={rec.download_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: "8px",
                padding: "8px 14px",
                background: "#4f46e5",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
              }}
            >
              Download Recording
            </a>
          ) : (
            <p>No download available yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}
