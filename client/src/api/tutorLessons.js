// client/src/api/tutorLessons.js
import { apiFetch } from "../lib/apiFetch";

/* ================================================================
   GET ALL LESSONS FOR TUTOR
================================================================ */
export async function listTutorLessons() {
  const data = await apiFetch("/api/lessons/tutor", { auth: true });
  return Array.isArray(data) ? data : [];
}

/* ================================================================
   ACTION: Confirm lesson (paid → confirmed)
================================================================ */
export async function tutorConfirmLesson(id) {
  if (!id) throw new Error("Missing lessonId");
  const data = await apiFetch(`/api/lessons/${encodeURIComponent(id)}/confirm`, {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Complete lesson (confirmed → completed)
================================================================ */
export async function tutorCompleteLesson(id) {
  if (!id) throw new Error("Missing lessonId");
  const data = await apiFetch(`/api/lessons/${encodeURIComponent(id)}/complete`, {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Approve reschedule
   (reschedule_requested → confirmed with new times)
================================================================ */
export async function tutorApproveReschedule(id) {
  if (!id) throw new Error("Missing lessonId");
  const data = await apiFetch(
    `/api/reschedule/${encodeURIComponent(id)}/approve`,
    { method: "PATCH", auth: true }
  );
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Reject reschedule
   (reschedule_requested → confirmed with original time)
================================================================ */
export async function tutorRejectReschedule(id) {
  if (!id) throw new Error("Missing lessonId");
  const data = await apiFetch(
    `/api/reschedule/${encodeURIComponent(id)}/reject`,
    { method: "PATCH", auth: true }
  );
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Tutor rejects pending (paid) lesson
   (paid → cancelled/rejected)
================================================================ */
export async function tutorRejectPending(id) {
  if (!id) throw new Error("Missing lessonId");
  const data = await apiFetch(
    `/api/lessons/${encodeURIComponent(id)}/reject`,
    { method: "PATCH", auth: true }
  );
  return await listTutorLessons();
}

/* ================================================================
   ACTION: Expire overdue lessons
   (backend marks expired)
================================================================ */
export async function tutorExpireOverdue() {
  const data = await apiFetch("/api/lessons/expire-overdue", {
    method: "PATCH",
    auth: true,
  });
  return await listTutorLessons();
}
