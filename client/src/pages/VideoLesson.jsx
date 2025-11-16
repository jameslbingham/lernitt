// /client/src/pages/VideoLesson.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function VideoLesson() {
  const iframeRef = useRef(null);
  const [roomUrl, setRoomUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

  const { user } = useAuth();
  const isTutor = user?.role === "tutor";

  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API}/api/video/create-room`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lessonId }),
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

    if (!lessonId) return;

    // Tutor: only load after "Start Lesson"
    if (isTutor) {
      if (hasStarted) {
        loadRoom();
      }
      return;
    }

    // Student (not tutor): load immediately
    loadRoom();
  }, [lessonId, isTutor, hasStarted]);

  const softGrey = "#d4d4d4";

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#f7f7f7",
        display: "flex",
        flexDirection: "column",
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
          textAlign: "center",
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
          background: "#eaeaea",
        }}
      >
        {/* WRAPPER WITH BORDER (unchanged shape) */}
        <div
          style={{
            width: "90%",
            height: "90%",
            border: `2px solid ${softGrey}`, // original border, light grey
            borderRadius: "12px",
            overflow: "hidden",
            background: "black",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tutor pre-start screen */}
          {isTutor && !hasStarted && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
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
                  cursor: "pointer",
                }}
              >
                Start Lesson
              </button>
            </div>
          )}

          {/* Student waiting screen (before room loads) */}
          {!isTutor && !roomUrl && loading && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <p style={{ fontSize: "18px" }}>Joining the lesson…</p>
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
                border: "none", // border is on wrapper
              }}
            />
          )}

          {/* Error state */}
          {!loading && !roomUrl && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "red",
                background: "black",
              }}
            >
              <p style={{ fontSize: "18px" }}>
                Could not load video room.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
