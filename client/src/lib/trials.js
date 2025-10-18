// client/src/lib/trials.js
// Computes trial usage per student, respecting: max 3 overall, max 1 per tutor.

const isCountable = (lesson) => {
  // Count only valid, non-cancelled trials
  if (!lesson) return false;
  if (!lesson.isTrial) return false;
  const st = (lesson.status || "").toLowerCase();
  return !["cancelled", "canceled"].includes(st);
};

export function computeTrialUsage(lessons = []) {
  const usage = new Map(); // studentId -> { total, byTutor: Map<tutorId,count> }

  for (const L of lessons) {
    const studentId = L?.student?.id || L?.studentId;
    const tutorId = L?.tutor?.id || L?.tutorId;

    if (!studentId || !tutorId) continue;
    if (!isCountable(L)) continue;

    if (!usage.has(studentId)) usage.set(studentId, { total: 0, byTutor: new Map() });
    const u = usage.get(studentId);

    u.total += 1;
    u.byTutor.set(tutorId, Math.min(1, (u.byTutor.get(tutorId) || 0) + 1)); // cap per-tutor at 1
  }

  // Convert to plain objects and compute remaining allowances
  const out = {};
  for (const [studentId, u] of usage.entries()) {
    const byTutorObj = {};
    for (const [tutorId, count] of u.byTutor.entries()) byTutorObj[tutorId] = count;

    out[studentId] = {
      totalTrialsUsed: Math.min(3, u.total),
      totalTrialsRemaining: Math.max(0, 3 - u.total),
      byTutor: byTutorObj, // { [tutorId]: 0|1 }
    };
  }
  return out;
}

// Helper to get a specific student's usage quickly
export function getStudentTrialUsage(usageMap, studentId) {
  return usageMap[studentId] || { totalTrialsUsed: 0, totalTrialsRemaining: 3, byTutor: {} };
}

// Helper to know if student can book a trial with a tutor
export function canBookTrial(usageMap, studentId, tutorId) {
  const u = getStudentTrialUsage(usageMap, studentId);
  const usedWithTutor = (u.byTutor || {})[tutorId] || 0;
  return u.totalTrialsRemaining > 0 && usedWithTutor === 0;
}
