// /client/src/pages/VideoLesson.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import DailyIframe from "@daily-co/daily-js";

export default function VideoLesson() {
  const containerRef = useRef(null);     // Daily video mount point
  const callRef = useRef(null);          // Daily call object

  const [roomUrl, setRoomUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

  const { user, getToken } = useAuth();
  const token = getToken();

  const API = import.meta.env.VITE_API;

  // ---------------------------------------------------
  // 1️⃣ Load Lesson
  // ---------------------------------------------------
  useEffect(() => {
    async function loadLesson() {
      try {
        const res = await fetch(`${API}/api/lessons/${lessonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLesson(data);
      } catch {
        setLesson(null);
      }
    }
    if (lessonId) loadLesson();
  }, [lessonId, API, token]);

  const isTutor = lesson && user?._id === lesson.tutor;
  const isStudent = lesson && user?._id === lesson.student;

  // ---------------------------------------------------
  // 2️⃣ Create Room (Server)
  // ---------------------------------------------------
  useEffect(() => {
    if (!lesson || (!isTutor && !isStudent)) return;

    async function loadRoom() {
      try {
        const res = await fetch(`${API}/api/video/create-room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId }),
        });

        const data = await res.json();
        if (data.roomUrl) {
          setRoomUrl(data.roomUrl);
        }
      } catch (err) {
        console.error("Room load error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isTutor) {
      if (hasStarted) loadRoom();
      return;
    }

    if (isStudent) {
      loadRoom();
    }

  }, [lesson, isTutor, isStudent, hasStarted, lessonId, API]);

  // ---------------------------------------------------
  // 3️⃣ DAILY SDK — Join the call
  // ---------------------------------------------------
  useEffect(() => {
    if (!roomUrl) return;
    if (!containerRef.current) return;

    // Create Daily Call
    const call = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "none",
      },
    });

    callRef.current = call;

    call.join({ url: roomUrl });

    // Sync mic/cam state
    call.setLocalAudio(micOn);
    call.setLocalVideo(camOn);

    return () => {
      call.leave();
      call.destroy();
    };
  }, [roomUrl]);

  // ---------------------------------------------------
  // 4️⃣ Toggle Mic / Cam
  // ---------------------------------------------------
  function toggleMic() {
    if (!callRef.current) return;
    const next = !micOn;
    setMicOn(next);
    callRef.current.setLocalAudio(next);
  }

  function toggleCam() {
    if (!callRef.current) return;
    const next = !camOn;
    setCamOn(next);
    callRef.current.setLocalVideo(next);
  }

  // ---------------------------------------------------
  // 5️⃣ Leave Lesson
  // ---------------------------------------------------
  function leaveLesson() {
    if (callRef.current) {
      callRef.current.leave();
      callRef.current.destroy();
    }
    if (isTutor) navigate("/tutor-lessons");
    else navigate("/my-lessons");
  }

  if (!lesson) {
    return <p style={{ padding: 20 }}>Loading lesson…</p>;
  }

  if (!isTutor && !isStudent) {
    return <p style={{ padding: 20 }}>You are not part of this lesson.</p>;
  }

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

      {/* MAIN AREA */}
      <div
        style={{
          flex: 1,
          background: "#eaeaea",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* BORDER */}
        <div
          style={{
            width: "90%",
            height: "90%",
            border: `2px solid ${softGrey}`,
            borderRadius: "12px",
            position: "relative",
            overflow: "hidden",
            background: "black",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* LEAVE BUTTON */}
          <button
            onClick={leaveLesson}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 20,
              background: "#ff4d4f",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Leave Lesson
          </button>

          {/* MIC/CAM BUTTONS */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "12px",
              zIndex: 20,
            }}
          >
            <button
              onClick={toggleMic}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: micOn ? "#4f46e5" : "#9ca3af",
                color: "white",
                cursor: "pointer",
              }}
            >
              {micOn ? "Mute Mic" : "Unmute Mic"}
            </button>

            <button
              onClick={toggleCam}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: camOn ? "#4f46e5" : "#9ca3af",
                color: "white",
                cursor: "pointer",
              }}
            >
              {camOn ? "Turn Camera Off" : "Turn Camera On"}
            </button>
          </div>

          {/* TUTOR START */}
          {isTutor && !hasStarted && !roomUrl && (
            <div
              style={{
                flex: 1,
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <p style={{ fontSize: "18px", marginBottom: "10px" }}>
                When you are ready, start the lesson.
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  setHasStarted(true);
                }}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#4f46e5",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Start Lesson
              </button>
            </div>
          )}

          {/* STUDENT WAIT */}
          {isStudent && !roomUrl && loading && (
            <div
              style={{
                flex: 1,
                color: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              Waiting for tutor…
            </div>
          )}

          {/* DAILY VIDEO MOUNT */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          />
        </div>
      </div>
    </div>
  );
}
