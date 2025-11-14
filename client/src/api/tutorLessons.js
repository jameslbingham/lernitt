// client/src/api/tutorLessons.js
const MOCK = import.meta.env.VITE_MOCK === "1";

const KEY = "mock:tutorLessons";
const nowIso = () => new Date().toISOString();
const plusHours = (iso, h) => new Date(new Date(iso).getTime() + h * 3600_000).toISOString();

const seedData = [
  // booked (student reserved, not yet paid)
  {
    id: "1",
    student: "Alice",
    date: "2025-09-25",
    time: "10:00",
    status: "booked",
    createdAt: nowIso(),
  },
  // paid (student paid, waiting tutor confirmation)
  {
    id: "2",
    student: "Charlie",
    date: "2025-09-26",
    time: "15:30",
    status: "paid",
  },
  // confirmed
  {
    id: "3",
    student: "Bea",
    date: "2025-09-24",
    time: "09:00",
    status: "confirmed",
  },
  // completed
  {
    id: "4",
    student: "David",
    date: "2025-09-20",
    time: "18:00",
    status: "completed",
  },
  // cancelled
  {
    id: "5",
    student: "Eva",
    date: "2025-09-22",
    time: "14:00",
    status: "cancelled",
  },
  // expired
  {
    id: "6",
    student: "Frank",
    date: "2025-09-21",
    time: "12:00",
    status: "expired",
  },
  // example reschedule_pending (kept for UI testing)
  {
    id: "7",
    student: "Gina",
    date: "2025-09-27",
    time: "11:00",
    status: "reschedule_pending",
    requestedNewDate: "2025-09-28",
    requestedNewTime: "13:00",
    createdAt: nowIso(),
    pendingUntil: plusHours(nowIso(), 12),
    previousStatus: "confirmed",
  },
];

function load() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : seedData.slice();
}
function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export async function listTutorLessons() {
  if (MOCK) return load();
  const token = localStorage.getItem("token");
  const r = await fetch(
    (import.meta.env.VITE_API || "http://localhost:5000") + "/api/lessons/tutor",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!r.ok) throw new Error("Failed to load lessons");
  return r.json();
}

export async function confirmLesson(id) {
  if (MOCK) {
    const ls = load().map((l) =>
      l.id === id
        ? {
            ...l,
            status: "confirmed",
            pendingUntil: undefined,
            requestedNewDate: undefined,
            requestedNewTime: undefined,
            previousStatus: undefined,
          }
        : l
    );
    save(ls);
    return ls;
  }
  const token = localStorage.getItem("token");
  const r = await fetch(
    (import.meta.env.VITE_API || "http://localhost:5000") +
      `/api/lessons/${id}/confirm`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!r.ok) throw new Error("Confirm failed");
  return listTutorLessons();
}

export async function completeLesson(id) {
  if (MOCK) {
    const ls = load().map((l) =>
      l.id === id ? { ...l, status: "completed" } : l
    );
    save(ls);
    return ls;
  }
  const token = localStorage.getItem("token");
  const r = await fetch(
    (import.meta.env.VITE_API || "http://localhost:5000") +
      `/api/lessons/${id}/complete`,
    {
      method: "PATCH",
      headers: { Authorization: { Authorization: `Bearer ${token}` } },
    }
  );
  if (!r.ok) throw new Error("Complete failed");
  return listTutorLessons();
}

/* Reschedule approvals (mock) */
export async function approveReschedule(id) {
  if (MOCK) {
    const ls = load().map((l) => {
      if (l.id !== id) return l;
      const date = l.requestedNewDate || l.date;
      const time = l.requestedNewTime || l.time;
      return {
        ...l,
        date,
        time,
        status: "confirmed",
        requestedNewDate: undefined,
        requestedNewTime: undefined,
        previousStatus: undefined,
        pendingUntil: undefined,
      };
    });
    save(ls);
    return ls;
  }
  throw new Error("Not implemented (real mode)");
}

export async function rejectReschedule(id) {
  if (MOCK) {
    const ls = load().map((l) => {
      if (l.id !== id) return l;
      return {
        ...l,
        status: l.previousStatus || "confirmed",
        requestedNewDate: undefined,
        requestedNewTime: undefined,
        previousStatus: undefined,
        pendingUntil: undefined,
      };
    });
    save(ls);
    return ls;
  }
  throw new Error("Not implemented (real mode)");
}

/* 🆕 Expiry helpers (mock) */
export async function rejectPending(id) {
  if (MOCK) {
    const ls = load().map((l) =>
      l.id === id
        ? { ...l, status: "not_approved", pendingUntil: undefined }
        : l
    );
    save(ls);
    return ls;
  }
  throw new Error("Not implemented (real mode)");
}

export async function expireOverdue() {
  if (MOCK) {
    const now = new Date();
    const ls = load().map((l) => {
      if (
        (l.status === "pending" || l.status === "reschedule_pending") &&
        l.pendingUntil
      ) {
        if (new Date(l.pendingUntil) < now) {
          // pending -> not_approved ; reschedule_pending -> revert to original
          if (l.status === "pending") {
            return {
              ...l,
              status: "not_approved",
              pendingUntil: undefined,
            };
          }
          if (l.status === "reschedule_pending") {
            return {
              ...l,
              status: l.previousStatus || "confirmed",
              requestedNewDate: undefined,
              requestedNewTime: undefined,
              previousStatus: undefined,
              pendingUntil: undefined,
            };
          }
        }
      }
      return l;
    });
    save(ls);
    return ls;
  }
  throw new Error("Not implemented (real mode)");
}
