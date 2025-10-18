// client/src/api/reviews.js
const MOCK = import.meta.env.VITE_MOCK === "1";
const API = import.meta.env.VITE_API || "http://localhost:5000";

const mockDB = {
  reviewsByTutor: {
    t1: [
      {
        _id: "r1",
        rating: 5,
        text: "Great lesson! Very clear explanations.",
        createdAt: new Date().toISOString(),
        student: { name: "Alice Student" },
      },
      {
        _id: "r2",
        rating: 4,
        text: "Helpful but a bit fast.",
        createdAt: new Date().toISOString(),
        student: { name: "Charlie Student" },
      },
    ],
  },
  lessonsDone: new Set(["mock-lesson-1"]),
};

async function jsonOrThrow(r, msg = "Request failed") {
  const t = await r.text();
  let data;
  try {
    data = t ? JSON.parse(t) : {};
  } catch {
    data = { message: t };
  }
  if (!r.ok) throw new Error(data.message || `${msg} (HTTP ${r.status})`);
  return data;
}

export async function getTutorReviews(tutorId) {
  if (MOCK) {
    return mockDB.reviewsByTutor[tutorId] || mockDB.reviewsByTutor.t1 || [];
  }
  const r = await fetch(`${API}/api/reviews/tutor/${tutorId}`);
  return jsonOrThrow(r, "Failed to load reviews");
}

export async function getTutorReviewSummary(tutorId) {
  if (MOCK) {
    const list =
      mockDB.reviewsByTutor[tutorId] || mockDB.reviewsByTutor.t1 || [];
    if (!list.length) return { avgRating: null, count: 0 };
    const sum = list.reduce((a, b) => a + (b.rating || 0), 0);
    return { avgRating: sum / list.length, count: list.length };
  }
  const r = await fetch(`${API}/api/reviews/tutor/${tutorId}/summary`);
  return jsonOrThrow(r, "Failed to load review summary");
}

export async function canReview(lessonId) {
  if (MOCK) return mockDB.lessonsDone.has(lessonId);
  const token = localStorage.getItem("token");
  if (!token) return false;
  const r = await fetch(`${API}/api/reviews/can/${lessonId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await jsonOrThrow(r, "Failed to check review");
  return !!data.canReview;
}

export async function postReview(lessonId, rating, text) {
  if (MOCK) {
    const entry = {
      _id: String(Date.now()),
      rating,
      text,
      createdAt: new Date().toISOString(),
      student: { name: "Mock Student" },
    };
    (mockDB.reviewsByTutor.t1 ||= []).push(entry);
    return entry;
  }

  const token = localStorage.getItem("token") || "";
  const r = await fetch(`${API}/api/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ lessonId, rating, text }),
  });
  return jsonOrThrow(r, "Failed to post review");
}
