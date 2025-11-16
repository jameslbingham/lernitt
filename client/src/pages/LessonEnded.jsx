// /client/src/pages/LessonEnded.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function LessonEnded() {
  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

  const { user, getToken } = useAuth();
  const token = getToken();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = import.meta.env.VITE_API;

  useEffect(() => {
    async function loadLesson() {
      if (!lessonId || !token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/lessons/${lessonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLesson(data);
      } catch (err) {
        console.error("Load lesson error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLesson();
  }, [lessonId, token, API]);

  const isTutor = user?.role === "tutor";
  const dashboardPath = isTutor ? "/tutor-lessons" : "/my-lessons";

  function handleReturn() {
    navigate(dashboardPath);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString();
  }

  function getDurationText() {
    if (!lesson) return "";
    if (typeof lesson.durationMins === "number" && lesson.durationMins > 0) {
      return `${lesson.durationMins} minutes`;
    }
    if (lesson.startTime && lesson.endTime) {
      const start = new Date(lesson.startTime);
      const end = new Date(lesson.endTime);
      const mins = Math.max(0, Math.round((end - start) / 60000));
      return `${mins} minutes`;
    }
    return "";
  }

  function getTutorLabel() {
    const t = lesson?.tutor;
    if (!t) return "Tutor";
    if (typeof t === "string") return "Tutor";
    return t.name || t.fullName || t.email || "Tutor";
  }

  function getStudentLabel() {
    const s = lesson?.student;
    if (!s) return "Student";
    if (typeof s === "string") return "Student";
    return s.name || s.fullName || s.email || "Student";
  }

  const softGrey = "#d4d4d4";

  if (loading) {
    return <p style={{ padding: 20 }}>Loading lesson summary…</p>;
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
            fontSize: 22,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Lesson completed successfully.
        </h1>

        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#4b5563",
            marginBottom: 20,
          }}
        >
          Thank you for using lernitt for your live lesson.
        </p>

        {lesson && (
          <div
            style={{
              background: "#f9fafb",
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <strong>Lesson ID:</strong> {String(lesson._id || lesson.id || "")}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Tutor:</strong> {getTutorLabel()}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Student:</strong> {getStudentLabel()}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Start time:</strong> {formatDate(lesson.startTime)}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>End time:</strong> {formatDate(lesson.endTime)}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Duration:</strong> {getDurationText()}
            </div>
          </div>
        )}

        <div
          style={{
            background: "#eef2ff",
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
            color: "#312e81",
            marginBottom: 20,
          }}
        >
          If this lesson was recorded, you may be able to download the
          recording from your lernitt account or via a link shared by your
          tutor, typically within the next 30 days.
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            disabled
            title="Recording download links will be added in a later step."
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "#9ca3af",
              color: "white",
              cursor: "not-allowed",
              fontSize: 14,
            }}
          >
            Download Recording (coming soon)
          </button>

          <button
            type="button"
            onClick={handleReturn}
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
            Return to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
