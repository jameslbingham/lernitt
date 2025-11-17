// /client/src/pages/LessonRecordings.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function LessonRecordings() {
  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

  const navigate = useNavigate();
  const { getToken } = useAuth();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [recordings, setRecordings] = useState([]);

  const API = import.meta.env.VITE_API;

  /* ------------------------------------------------------------
    1. Extract load() so it can be reused by polling
  ------------------------------------------------------------ */
  async function load() {
    if (!lessonId || !token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${API}/api/video/lesson-recordings?lessonId=${lessonId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setRecordings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Recording load error:", err);
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------
    2. Initial load (unchanged except calling extracted load())
  ------------------------------------------------------------ */
  useEffect(() => {
    load();
  }, [lessonId, token, API]);

  /* ------------------------------------------------------------
    3. NEW — Auto-refresh recording info every 5 seconds
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!lessonId || !token) return;

    const id = setInterval(() => {
      load(); // re-fetch recording metadata
    }, 5000);

    return () => clearInterval(id);
  }, [lessonId, token]);

  const softGrey = "#d4d4d4";

  if (loading) {
    return <p style={{ padding: 20 }}>Loading recordings…</p>;
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f7f7f7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 40,
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: 700,
          border: `2px solid ${softGrey}`,
          borderRadius: 12,
          background: "white",
          padding: 24,
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontSize: 22,
            marginBottom: 16,
          }}
        >
          Lesson Recordings
        </h1>

        {recordings.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 15, color: "#4b5563" }}>
            No recordings available for this lesson yet.
          </p>
        )}

        {recordings.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {recordings.map((rec) => (
              <div
                key={rec.id}
                style={{
                  border: `1px solid ${softGrey}`,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                  background: "#f9fafb",
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <strong>Recording ID:</strong> {rec.id}
                </div>

                <div style={{ marginBottom: 6 }}>
                  <strong>Created:</strong>{" "}
                  {rec.created
                    ? new Date(rec.created).toLocaleString()
                    : "Unknown"}
                </div>

                <div style={{ marginBottom: 6 }}>
                  <strong>Duration:</strong>{" "}
                  {rec.duration ? `${rec.duration}s` : "Unknown"}
                </div>

                <div style={{ marginBottom: 6 }}>
                  <strong>Download:</strong>{" "}
                  {rec.downloadUrl ? (
                    <a
                      href={rec.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#4f46e5", textDecoration: "underline" }}
                    >
                      Download File
                    </a>
                  ) : (
                    "Not available"
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#4f46e5",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
