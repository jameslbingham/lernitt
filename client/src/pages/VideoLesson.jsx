// /client/src/pages/VideoLesson.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function VideoLesson() {
  const iframeRef = useRef(null);
  const [roomUrl, setRoomUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

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
        if (data.roomUrl) {
          setRoomUrl(data.roomUrl);
        }
      } catch (err) {
        console.error("Video load error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (lessonId) loadRoom();
  }, [lessonId]);

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
      {/* Header */}
      <div
        style={{
          background: "#4f46e5",
          color: "white",
          padding: "14px",
          fontSize: "20px",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        lernitt — Live Lesson
      </div>

      {/* Main video area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#eaeaea",
        }}
      >
        {loading && <p style={{ fontSize: "18px" }}>Loading video room…</p>}

        {!loading && roomUrl && (
          <iframe
            ref={iframeRef}
            src={`${roomUrl}?embed=true&audioSource=mic&videoSource=camera&layout=custom&hideLogo=true`}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            style={{
              width: "90%",
              height: "90%",
              border: "2px solid #d4d4d4", // soft light grey
              borderRadius: "12px",
              background: "black",
            }}
          />
        )}

        {!loading && !roomUrl && (
          <p style={{ color: "red", fontSize: "18px" }}>
            Could not load video room.
          </p>
        )}
      </div>
    </div>
  );
}
