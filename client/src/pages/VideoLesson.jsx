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

  const softGrey = "#d4d4d4"; // BORDER COLOUR YOU WANT

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
        {/* WRAPPER WITH THE BORDER — THIS IS THE FIX */}
        <div
          style={{
            width: "90%",
            height: "90%",
            border: `2px solid ${softGrey}`,   // ORIGINAL BORDER, EXACT SHAPE
            borderRadius: "12px",              // ORIGINAL RADIUS
            overflow: "hidden",                // ensures corners stay rounded
            background: "black",               // original background
          }}
        >
          {loading && (
            <p style={{ fontSize: "18px", color: "white", padding: "20px" }}>
              Loading video room…
            </p>
          )}

          {!loading && roomUrl && (
            <iframe
              ref={iframeRef}
              src={`${roomUrl}?embed=true&audioSource=mic&videoSource=camera&layout=custom&hideLogo=true`}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              style={{
                width: "100%",
                height: "100%",
                border: "none", // border is now on the WRAPPER (correct)
              }}
            />
          )}

          {!loading && !roomUrl && (
            <p style={{ color: "red", fontSize: "18px", padding: "20px" }}>
              Could not load video room.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
