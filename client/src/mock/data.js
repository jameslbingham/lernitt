// client/src/mock/data.js
const LS = (k) => `mock:${k}`;

const seed = {
  users: [
    { id: "student-1", name: "Alice Student", role: "student" },
    { id: "tutor-1", name: "Bob Tutor", role: "tutor" },
  ],
  tutors: [
    {
      id: "tutor-1",
      name: "Bob Tutor",
      bio: "Friendly ESL tutor.",
      subjects: ["English"],
      price: 20,
      avatar: "",
      approved: true,
    },
  ],
  reviewsByTutor: {
    "tutor-1": [
      { id: "r1", studentId: "student-1", rating: 5, text: "Great!", createdAt: Date.now() - 86400000 },
    ],
  },
  lessonsByUser: {
    "student-1": [
      { id: "lesson-1", tutorId: "tutor-1", studentId: "student-1", start: isoTodayAt(15), duration: 30, isTrial: true, status: "completed" },
    ],
  },
  availabilityByTutor: {
    "tutor-1": {
      tz: "Europe/Madrid",
      slotInterval: 30,
      rules: {
        // Simple weekly rule: Mon–Fri 10:00–16:00
        days: [1, 2, 3, 4, 5],
        startHour: 10,
        endHour: 16,
      },
      exceptions: [],
    },
  },
  trialsTotalByUser: { "student-1": 1 },
  trialsByTutorByUser: { "student-1:tutor-1": 1 },
};

function isoTodayAt(h) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
}

export function ensureSeed() {
  if (!localStorage.getItem(LS("seeded"))) {
    localStorage.setItem(LS("tutors"), JSON.stringify(seed.tutors));
    localStorage.setItem(LS("reviewsByTutor")), JSON.stringify(seed.reviewsByTutor);
    localStorage.setItem(LS("lessonsByUser"), JSON.stringify(seed.lessonsByUser));
    localStorage.setItem(LS("availabilityByTutor"), JSON.stringify(seed.availabilityByTutor));
    localStorage.setItem(LS("trialsTotalByUser"), JSON.stringify(seed.trialsTotalByUser));
    localStorage.setItem(LS("trialsByTutorByUser"), JSON.stringify(seed.trialsByTutorByUser));
    localStorage.setItem(LS("seeded"), "1");
  }
}

export function getDB() {
  ensureSeed();
  return {
    tutors: read("tutors", []),
    reviewsByTutor: read("reviewsByTutor", {}),
    lessonsByUser: read("lessonsByUser", {}),
    availabilityByTutor: read("availabilityByTutor", {}),
    trialsTotalByUser: read("trialsTotalByUser", {}),
    trialsByTutorByUser: read("trialsByTutorByUser", {}),
  };
}

export function saveDB(partial) {
  Object.entries(partial).forEach(([k, v]) => {
    localStorage.setItem(LS(k), JSON.stringify(v));
  });
}

function read(key, fallback) {
  const raw = localStorage.getItem(LS(key));
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

// Utilities
export function currentUserId() {
  return localStorage.getItem("userId") || "student-1";
}

export function nextId(prefix) {
  const key = LS(`id:${prefix}`);
  const n = parseInt(localStorage.getItem(key) || "1", 10);
  localStorage.setItem(key, String(n + 1));
  return `${prefix}-${n}`;
}
