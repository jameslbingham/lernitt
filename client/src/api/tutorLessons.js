// client/src/api/tutorLessons.js
const MOCK = import.meta.env.VITE_MOCK === "1";

const KEY = "mock:tutorLessons";
const nowIso = () => new Date().toISOString();
const plusHours = (iso, h) =>
  new Date(new Date(iso).getTime() + h * 3600_000).toISOString();

/* -------------------------------------------------------
   NEW LIFECYCLE:
   booked → pending → paid → confirmed → completed → cancelled → expired
   booked = created by student but not yet approved by tutor
   pending = approved by tutor but unpaid
   paid = student paid; tutor must confirm
   confirmed = tutor has confirmed paid
   completed = tutor marked lesson completed
-------------------------------------------------------- */

const seedData = [
  // booked → tutor must approve
  {
    id: "1",
    student: "Alice",
    date: "2025-09-25",
    time: "10:00",
    status: "booked",
    createdAt: nowIso(),
    pendingUntil: plusHours(nowIso(), 12),
  },
  // paid → tutor must confirm
  {
    id: "2",
    student: "Charlie",
    date: "2025-09-26",
    time: "15:30",
    status: "paid",
  },
  // reschedule requested
  {
    id: "3",
    student: "Bea",
    date: "2025-09-24",
    time: "09:00",
    status: "reschedule_requested",
    requestedNewDate: "2025-09-27",
    requestedNewTime: "11:30",
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
    (import.meta.env.VITE_API || "http://localhost:5000") +
      "/api/lessons/tutor",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) throw new Error("Failed to load lessons");
  return r.json();
}

/* -------------------------------------------------------
   1. BOOKED → PENDING (Tutor approves booking)
-------------------------------------------------------- */
export async function approveBooking(id) {
  if (MOCK) {
    const ls = load().map((l) =>
      l.id === id
        ? {
            ...l,
            status: "pending",
            pendingUntil: plusHours(nowIso(), 12),
          }
        : l
    );
    save(ls);
    return ls;
  }

  const token = localStorage.getItem("token");
  const r = await fetch(
    `${import.meta.env.VITE_API || "http://localhost:5000"}/api/lessons/${id}/approve`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) throw new Error("Approve failed");
  return listTutorLessons();
}

/* -------------------------------------------------------
   REJECT BOOKING (booked → cancelled)
-------------------------------------------------------- */
export async function rejectBooking(id) {
  if (MOCK) {
    const ls = load().map((l) =>
      l.id === id
        ? { ...l, status: "cancelled", pendingUntil: undefined }
        : l
    );
    save(ls);
    return ls;
  }

  const token = localStorage.getItem("token");
  const r = await fetch(
    `${import.meta.env.VITE_API || "http://localhost:5000"}/api/lessons/${id}/reject`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) throw new Error("Reject failed");
  return listTutorLessons();
}

/* -------------------------------------------------------
   2. PAID → CONFIRMED (Tutor confirms paid)
-------------------------------------------------------- */
export async function confirmPaidLesson(id) {
  if (MOCK) {
    const ls = load().map((l) =>
      l.id === id
        ? { ...l, status: "confirmed", pendingUntil: undefined }
        : l
    );
    save(ls);
    return ls;
  }

  const token = localStorage.getItem("token");
  const r = await fetch(
    `${import.meta.env.VITE_API || "http://localhost:5000"}/api/lessons/${id}/confirm-paid`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) throw new Error("Confirm paid failed");
  return listTutorLessons();
}

/* -------------------------------------------------------
   3. CONFIRMED → COMPLETED
-------------------------------------------------------- */
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
    `${import.meta.env.VITE_API || "http://localhost:5000"}/api/lessons/${id}/complete`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) throw new Error("Complete failed");
  return listTutorLessons();
}

/* -------------------------------------------------------
   RESCHEDULE: Tutor approves or rejects
-------------------------------------------------------- */
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
    const ls = load().map((l) =>
      l.id === id
        ? {
            ...l,
            status: l.previousStatus || "confirmed",
            requestedNewDate: undefined,
            requestedNewTime: undefined,
            previousStatus: undefined,
            pendingUntil: undefined,
          }
        : l
    );
    save(ls);
    return ls;
  }

  throw new Error("Not implemented (real mode)");
}

/* -------------------------------------------------------
   EXPIRY HANDLING
-------------------------------------------------------- */
export async function expireOverdue() {
  if (MOCK) {
    const now = new Date();
    const ls = load().map((l) => {
      if (
        ["booked", "pending", "reschedule_requested"].includes(l.status) &&
        l.pendingUntil
      ) {
        if (new Date(l.pendingUntil) < now) {
          if (l.status === "booked") {
            return { ...l, status: "cancelled", pendingUntil: undefined };
          }
          if (l.status === "pending") {
            return { ...l, status: "expired", pendingUntil: undefined };
          }
          if (l.status === "reschedule_requested") {
            return {
              ...l,
              status: l.previousStatus || "confirmed",
              pendingUntil: undefined,
              requestedNewDate: undefined,
              requestedNewTime: undefined,
              previousStatus: undefined,
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
