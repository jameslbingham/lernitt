// client/src/api/tutorLessons.js
import { apiFetch } from "../lib/apiFetch";

/* ================================================================
   GET ALL LESSONS FOR TUTOR
   - Returns normalized list from /api/lessons/tutor
================================================================ */
export async function listTutorLessons() {
  const data = await apiFetch("/api/lessons/tutor", { auth: true });
  return Array.isArray(data) ? data : [];
}

/* ================================================================
   ACTION: Tutor approves a PAID booking
   - Status: paid → confirmed
   - Backend: PATCH /api/lessons/:id/confirm
================================================================ */
export async function tutorApproveBooking(id) {
  if (!id) throw new Error("Missing lessonId");
  await apiFetch(`/api/lessons/${encodeURIComponent(id)}/confirm`, {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Tutor rejects a PAID booking
   - Status: paid → cancelled (or equivalent backend logic)
   - Backend: PATCH /api/lessons/:id/reject
================================================================ */
export async function tutorRejectBooking(id) {
  if (!id) throw new Error("Missing lessonId");
  await apiFetch(`/api/lessons/${encodeURIComponent(id)}/reject`, {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Approve reschedule request
   - Status: reschedule_requested → confirmed (new times)
   - ✅ FIXED: Route updated to match server/routes/lessons.js
================================================================ */
export async function tutorApproveReschedule(id) {
  if (!id) throw new Error("Missing lessonId");
  await apiFetch(`/api/lessons/${encodeURIComponent(id)}/reschedule-approve`, {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Reject reschedule request
   - Status: reschedule_requested → confirmed (original time)
   - ✅ FIXED: Route updated to match server/routes/lessons.js
================================================================ */
export async function tutorRejectReschedule(id) {
  if (!id) throw new Error("Missing lessonId");
  await apiFetch(`/api/lessons/${encodeURIComponent(id)}/reschedule-reject`, {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Tutor marks lesson completed
   - Status: confirmed → completed
   - Backend: PATCH /api/lessons/:id/complete
================================================================ */
export async function tutorMarkCompleted(id) {
  if (!id) throw new Error("Missing lessonId");
  await apiFetch(`/api/lessons/${encodeURIComponent(id)}/complete`, {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Expire overdue lessons
   - Backend decides which lessons to mark expired
   - Backend: PATCH /api/lessons/expire-overdue
================================================================ */
export async function tutorExpireOverdue() {
  await apiFetch("/api/lessons/expire-overdue", {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   Backwards-compatibility aliases (if any old code still uses them)
   - These simply forward to the new functions.
================================================================ */
export const tutorConfirmLesson = tutorApproveBooking;
export const tutorCompleteLesson = tutorMarkCompleted;
export const tutorRejectPending = tutorRejectBooking;
