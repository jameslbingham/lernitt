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
        if (data.roomUrl) setRoomUrl(data.roomUrl);
      } catch (err) {
        console.error("Video load error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (lessonId) loadRoom();
  }, [lessonId]);

  const softGrey = "#d4d4d4"; // NEW LIGHT GREY

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
      {/* HEADER — same grey as border, white text, slightly smaller */}
      <div
        style={{
          background: softGrey,
          color: "white",
          padding: "14px",
          fontSize: "18px",    // slightly smaller
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        lernitt — Live Lesson
      </div>

      {/* VIDEO */}
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
              border: `2px solid ${softGrey}`,  // ORIGINAL BORDER SIZE, NEW COLOUR
              borderRadius: "12px",             // ORIGINAL RADIUS
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
