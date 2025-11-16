// /client/src/pages/VideoLesson.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function VideoLesson() {
  const iframeRef = useRef(null);
  const [roomUrl, setRoomUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

  const { user, getToken } = useAuth();
  const token = getToken();

  const API = import.meta.env.VITE_API;

  // ---------------------------------------------------
  // 1️⃣ LOAD REAL LESSON
  // ---------------------------------------------------
  useEffect(() => {
    async function loadLesson() {
      try {
        const res = await fetch(`${API}/api/lessons/${lessonId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLesson(data);
      } catch {
        setLesson(null);
      }
    }
    if (lessonId) loadLesson();
  }, [lessonId, API, token]);

  // ---------------------------------------------------
  // 2️⃣ LOAD VIDEO ROOM
  // ---------------------------------------------------
  useEffect(() => {
    if (!lessonId) return;

    async function loadRoom() {
      try {
        const res = await fetch(
          `${API}/api/video/create-room`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lessonId })
          }
        );

        const data = await res.json();
        if (data.roomUrl) setRoomUrl(data.roomUrl);
      } catch (err) {
        console.error("Video load error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!lesson) return;

    const isTutor = user?._id === lesson.tutor;
    const isStudent = user?._id === lesson.student;

    if (!isTutor && !isStudent) {
      setLoading(false);
      return;
    }

    if (isTutor) {
      if (hasStarted) loadRoom();
      return;
    }

    if (isStudent) {
      loadRoom();
      return;
    }

  }, [lessonId, lesson, user, hasStarted, API]);

  // ---------------------------------------------------
  // 3️⃣ ROLE VALIDATION
  // ---------------------------------------------------
  if (lesson === null) {
    return <p style={{ padding: 20 }}>Loading lesson…</p>;
  }

  const isTutor = user?._id === lesson.tutor;
  const isStudent = user?._id === lesson.student;

  if (!isTutor && !isStudent) {
    return (
      <div style={{ padding: 20 }}>
        <h2>You are not part of this lesson.</h2>
      </div>
    );
  }

  const softGrey = "#d4d4d4";

  // ---------------------------------------------------
  // 4️⃣ LEAVE LESSON button handler
  // ---------------------------------------------------
  function leaveLesson() {
    if (isTutor) navigate("/tutor-lessons");
    else navigate("/my-lessons");
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#f7f7f7",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: softGrey,
          color: "white",
          padding: "14px",
          fontSize: "18px",
          fontWeight: "bold",
          textAlign: "center"
        }}
      >
        lernitt — Live Lesson
      </div>

      {/* VIDEO AREA */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#eaeaea"
        }}
      >
        {/* BORDER WRAPPER */}
        <div
          style={{
            width: "90%",
            height: "90%",
            border: `2px solid ${softGrey}`,
            borderRadius: "12px",
            overflow: "hidden",
            background: "black",
            position: "relative",   // ⭐ required for button positioning
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* ⭐ LEAVE LESSON BUTTON — TOP RIGHT */}
          <button
            type="button"
            onClick={leaveLesson}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 10,
              background: "#ff4d4f",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            Leave Lesson
          </button>

          {/* Tutor pre-start */}
          {isTutor && !hasStarted && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white"
              }}
            >
              <p style={{ fontSize: "18px", marginBottom: "16px" }}>
                When you are ready, start the lesson.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setHasStarted(true);
                }}
                style={{
                  padding: "10px 20px",
                  fontSize: "16px",
                  borderRadius: "999px",
                  border: "none",
                  background: "#4f46e5",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Start Lesson
              </button>
            </div>
          )}

          {/* Student waiting */}
          {isStudent && !roomUrl && loading && (
            <div
              style={{
                flex: 1,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <p style={{ fontSize: "18px" }}>Waiting for tutor…</p>
            </div>
          )}

          {/* Video iframe */}
          {!loading && roomUrl && (
            <iframe
              ref={iframeRef}
              src={`${roomUrl}?embed=true&audioSource=mic&videoSource=camera&layout=custom&hideLogo=true`}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              style={{
                width: "100%",
                height: "100%",
                border: "none"
              }}
            />
          )}

          {/* Error */}
          {!loading && !roomUrl && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "red",
                background: "black"
              }}
            >
              <p style={{ fontSize: "18px" }}>Could not load video room.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
