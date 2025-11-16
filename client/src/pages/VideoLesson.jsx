// /client/src/pages/VideoLesson.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import DailyIframe from "@daily-co/daily-js";

export default function VideoLesson() {
  const containerRef = useRef(null);
  const callRef = useRef(null);

  // CORE STATE
  const [roomUrl, setRoomUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  // Devices
  const [showDevices, setShowDevices] = useState(false);
  const [mics, setMics] = useState([]);
  const [cams, setCams] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCam, setSelectedCam] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  // Chat
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingOwner, setRecordingOwner] = useState(null);
  const [recordingId, setRecordingId] = useState(null);

  // Timer / auto-end
  const [timeLeftSecs, setTimeLeftSecs] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lessonId = params.get("lessonId");

  const { user, getToken } = useAuth();
  const token = getToken();
  const API = import.meta.env.VITE_API;

  // 1) Load Lesson
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
    if (lessonId && token) loadLesson();
  }, [lessonId, API, token]);

  const isTutor = lesson && user?._id === lesson.tutor;
  const isStudent = lesson && user?._id === lesson.student;

  // 2) Load Room URL (Tutor must click Start)
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
        if (data.roomUrl) setRoomUrl(data.roomUrl);
      } catch (err) {
        console.error("Room load error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isTutor && !hasStarted) return;
    loadRoom();
  }, [lesson, hasStarted, isTutor, isStudent, lessonId, API]);

  // 3) Daily Call + Devices
  useEffect(() => {
    if (!roomUrl) return;
    if (!containerRef.current) return;

    const call = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "none",
      },
    });

    callRef.current = call;

    call.join({ url: roomUrl });

    call.setLocalAudio(micOn);
    call.setLocalVideo(camOn);

    call.on("screen-share-started", () => setSharing(true));
    call.on("screen-share-stopped", () => setSharing(false));

    async function loadDevices() {
      const devices = await call.enumerateDevices();
      setMics(devices.mics || []);
      setCams(devices.cameras || []);
      setSpeakers(devices.speakers || []);

      if (devices.mics[0]) setSelectedMic(devices.mics[0].deviceId);
      if (devices.cameras[0]) setSelectedCam(devices.cameras[0].deviceId);
      if (devices.speakers && devices.speakers[0])
        setSelectedSpeaker(devices.speakers[0].deviceId);
    }

    loadDevices();

    return () => {
      call.leave();
      call.destroy();
    };
  }, [roomUrl]);

  // 4) Toggles
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

  async function toggleScreenShare() {
    if (!callRef.current) return;
    if (!sharing) {
      try {
        await callRef.current.startScreenShare();
      } catch (e) {
        console.error("Screen share failed:", e);
      }
    } else {
      try {
        await callRef.current.stopScreenShare();
      } catch (e) {
        console.error("Stop screen share failed:", e);
      }
    }
  }

  // 5) Device Settings Apply
  async function applyDeviceChanges() {
    if (!callRef.current) return;

    if (selectedMic) {
      await callRef.current.setInputDevicesAsync({ audioDeviceId: selectedMic });
    }
    if (selectedCam) {
      await callRef.current.setInputDevicesAsync({ videoDeviceId: selectedCam });
    }
    if (selectedSpeaker) {
      try {
        await callRef.current.setOutputDevice({ speakerDeviceId: selectedSpeaker });
      } catch {}
    }

    setShowDevices(false);
  }

  // 6) Leave Lesson
  function leaveLesson() {
    if (callRef.current) {
      callRef.current.leave();
      callRef.current.destroy();
    }
    if (isTutor) navigate("/tutor-lessons");
    else navigate("/my-lessons");
  }

  // 7) Chat Send
  function sendMessage() {
    if (!msgText.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: user._id,
        text: msgText.trim(),
      },
    ]);

    setMsgText("");

    setTimeout(() => {
      const box = document.getElementById("chat-box");
      if (box) box.scrollTop = box.scrollHeight;
    }, 50);
  }

  // 8) Recording
  async function startRecording() {
    if (!roomUrl) return;

    try {
      const res = await fetch(`${API}/api/video/start-recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomUrl }),
      });

      const data = await res.json();
      if (data.recording) {
        setIsRecording(true);
        setRecordingOwner(user._id);
        setRecordingId(data.recording.id || null);
      }
    } catch (err) {
      console.error("Start recording error:", err);
    }
  }

  async function stopRecording() {
    if (!isRecording) return;
    if (recordingOwner !== user._id) return;

    try {
      await fetch(`${API}/api/video/stop-recording`, {
        method: "POST",
      });

      setIsRecording(false);
      setRecordingOwner(null);
      setRecordingId(null);
    } catch (err) {
      console.error("Stop recording error:", err);
    }
  }

  // 9) Auto-end logic
  useEffect(() => {
    if (!lesson || !roomUrl || timerStarted === true) return;

    let mins = 0;
    if (typeof lesson.durationMins === "number" && lesson.durationMins > 0) {
      mins = lesson.durationMins;
    } else if (lesson.startTime && lesson.endTime) {
      const start = new Date(lesson.startTime);
      const end = new Date(lesson.endTime);
      mins = Math.max(0, Math.round((end - start) / 60000));
    }

    if (!mins) {
      mins = 60;
    }

    setTimeLeftSecs(mins * 60);
    setTimerStarted(true);
  }, [lesson, roomUrl, timerStarted]);

  useEffect(() => {
    if (!timerStarted) return;

    const id = setInterval(() => {
      setTimeLeftSecs((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          handleAutoEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStarted]);

  async function handleAutoEnd() {
    try {
      if (lesson && token) {
        await fetch(`${API}/api/video/complete-lesson`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lessonId }),
        });
      }
    } catch (err) {
      console.error("Auto-complete lesson error:", err);
    } finally {
      navigate(`/lesson-ended?lessonId=${lessonId}`);
    }
  }

  // RENDER
  if (!lesson) return <p style={{ padding: 20 }}>Loading lesson…</p>;

  if (!isTutor && !isStudent)
    return <p style={{ padding: 20 }}>You are not part of this lesson.</p>;

  const softGrey = "#d4d4d4";
  const minutesLeft =
    timeLeftSecs !== null ? Math.floor(timeLeftSecs / 60) : null;
  const secondsLeft =
    timeLeftSecs !== null ? timeLeftSecs % 60 : null;

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

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          background: "#eaeaea",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* OUTER BORDER */}
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
            flexDirection: "row",
          }}
        >
          {/* 5-minute countdown bar */}
          {timeLeftSecs !== null && timeLeftSecs <= 5 * 60 && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "6px 12px",
                background: "#fef3c7",
                color: "#92400e",
                borderRadius: 999,
                fontSize: 13,
                zIndex: 50,
              }}
            >
              Lesson ends in{" "}
              {minutesLeft !== null && secondsLeft !== null
                ? `${minutesLeft}:${String(secondsLeft).padStart(2, "0")}`
                : "a few minutes"}
            </div>
          )}

          {/* CHAT SIDEBAR */}
          {chatOpen && (
            <div
              style={{
                width: "300px",
                background: "#ffffff",
                borderLeft: `2px solid ${softGrey}`,
                display: "flex",
                flexDirection: "column",
                zIndex: 30,
              }}
            >
              <div
                style={{
                  padding: "10px",
                  background: softGrey,
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Chat
              </div>

              <div
                id="chat-box"
                style={{
                  flex: 1,
                  padding: "10px",
                  overflowY: "auto",
                  background: "#f9f9f9",
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      marginBottom: "8px",
                      textAlign: m.sender === user._id ? "right" : "left",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background:
                          m.sender === user._id ? "#4f46e5" : "#d1d5db",
                        color: m.sender === user._id ? "white" : "black",
                        maxWidth: "80%",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: "8px",
                  borderTop: `1px solid ${softGrey}`,
                  display: "flex",
                  gap: "6px",
                }}
              >
                <input
                  type="text"
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "6px",
                    border: `1px solid ${softGrey}`,
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: "8px 12px",
                    background: "#4f46e5",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* CHAT TOGGLE */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              position: "absolute",
              top: "12px",
              left: chatOpen ? "320px" : "12px",
              zIndex: 40,
              background: "#4f46e5",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {chatOpen ? "Close Chat" : "Open Chat"}
          </button>

          {/* LEAVE BUTTON */}
          <button
            onClick={leaveLesson}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 40,
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

          {/* DEVICE SETTINGS BUTTON */}
          <button
            onClick={() => setShowDevices(true)}
            style={{
              position: "absolute",
              top: "12px",
              right: "120px",
              zIndex: 40,
              background: "#4f46e5",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Device Settings
          </button>

          {/* RECORDING CONTROLS */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: chatOpen ? "150px" : "12px",
              display: "flex",
              gap: "8px",
              zIndex: 40,
            }}
          >
            {!isRecording && (
              <button
                onClick={startRecording}
                style={{
                  padding: "8px 14px",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Start Recording
              </button>
            )}

            {isRecording && (
              <button
                onClick={recordingOwner === user._id ? stopRecording : undefined}
                disabled={recordingOwner !== user._id}
                title={
                  recordingOwner !== user._id
                    ? "Only the person who started the recording can stop it."
                    : ""
                }
                style={{
                  padding: "8px 14px",
                  background:
                    recordingOwner === user._id ? "#ef4444" : "#9ca3af",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    recordingOwner === user._id ? "pointer" : "not-allowed",
                }}
              >
                Stop Recording
              </button>
            )}

            {isRecording && (
              <div
                style={{
                  padding: "8px 14px",
                  background: "#ef4444",
                  color: "white",
                  borderRadius: "8px",
                  fontWeight: "bold",
                }}
              >
                ● Recording
              </div>
            )}
          </div>

          {/* CONTROL BAR */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "12px",
              zIndex: 40,
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

            <button
              onClick={toggleScreenShare}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: sharing ? "#ef4444" : "#4f46e5",
                color: "white",
                cursor: "pointer",
              }}
            >
              {sharing ? "Stop Sharing" : "Share Screen"}
            </button>
          </div>

          {/* TUTOR WAIT */}
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

          {/* DAILY VIDEO */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
            }}
          />

          {/* DEVICE SETTINGS POPUP */}
          {showDevices && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                border: `2px solid ${softGrey}`,
                zIndex: 50,
                width: "320px",
              }}
            >
              <h3 style={{ marginBottom: "12px" }}>Device Settings</h3>

              <label>Microphone:</label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                style={{ width: "100%", marginBottom: "10px" }}
              >
                {mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || "Microphone"}
                  </option>
                ))}
              </select>

              <label>Camera:</label>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                style={{ width: "100%", marginBottom: "10px" }}
              >
                {cams.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || "Camera"}
                  </option>
                ))}
              </select>

              <label>Speakers:</label>
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                style={{ width: "100%", marginBottom: "10px" }}
              >
                {speakers.map((sp) => (
                  <option key={sp.deviceId} value={sp.deviceId}>
                    {sp.label || "Speakers"}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  onClick={() => setShowDevices(false)}
                  style={{
                    padding: "8px 12px",
                    background: "#9ca3af",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={applyDeviceChanges}
                  style={{
                    padding: "8px 12px",
                    background: "#4f46e5",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
