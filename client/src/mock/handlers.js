// /client/src/mock/handlers.js

import {
  listPayouts,
  addPayout,
  updatePayout,
  listRefunds,
  addRefund,
  updateRefund,
} from "./payoutsStore.js";

import {
  listNotifications,
  markRead,
  markAllRead,
  clearAll,
  addNotification, // <-- added
  deleteNotification, // <-- added
  markUnread, // <-- added
} from "./notificationsStore.js";

// --- Mock Data --------------------------------------------------------------

// Prices are in CENTS (e.g., 2500 => €25.00)
const tutors = [
  { id: "1", name: "Bob Tutor", subjects: ["English", "IELTS"], price: 2500, bio: "Experienced English tutor with exam focus." },
  { id: "2", name: "Alice Teacher", subjects: ["Spanish"], price: 1800, bio: "Friendly Spanish tutor for beginners." },
  { id: "3", name: "Chen Li", subjects: ["Business English"], price: 3200, bio: "Corporate English coach." },
  { id: "4", name: "María López", subjects: ["English"], price: 2200, bio: "Pronunciation and fluency specialist." },
  { id: "5", name: "Omar Khan", subjects: ["IELTS", "English"], price: 2800, bio: "IELTS strategies and feedback." },
  { id: "6", name: "Sara Rossi", subjects: ["Business English"], price: 3000, bio: "Meetings, emails, and presentations." },
  { id: "7", name: "Tom Nguyen", subjects: ["English"], price: 2000, bio: "Fun lessons with real-life topics." },
  { id: "8", name: "Elena Petrova", subjects: ["English", "Business English"], price: 2700, bio: "Focus on accuracy and style." },
];

const reviews = {
  "1": [
    { id: "r1", student: "Alice", text: "Great lesson!", rating: 5, createdAt: new Date().toISOString() },
    { id: "r2", student: "Mark", text: "Very helpful tips.", rating: 4, createdAt: new Date().toISOString() },
  ],
  "2": [{ id: "r3", student: "John", text: "Nice and patient.", rating: 5, createdAt: new Date().toISOString() }],
  "3": [
    { id: "r4", student: "Sophie", text: "Clear explanations.", rating: 5, createdAt: new Date().toISOString() },
    { id: "r5", student: "Leo", text: "Super useful.", rating: 5, createdAt: new Date().toISOString() },
    { id: "r6", student: "Nina", text: "Exactly what I needed.", rating: 4, createdAt: new Date().toISOString() },
  ],
  "4": [],
  "5": [{ id: "r7", student: "Ana", text: "IELTS band 7.5!", rating: 5, createdAt: new Date().toISOString() }],
  "6": [{ id: "r8", student: "Rob", text: "Great for emails.", rating: 4, createdAt: new Date().toISOString() }],
  "7": [{ id: "r9", student: "Mila", text: "Fun lessons!", rating: 5, createdAt: new Date().toISOString() }],
  "8": [
    { id: "r10", student: "Pedro", text: "Improved fast!", rating: 5, createdAt: new Date().toISOString() },
    { id: "r11", student: "Ivy", text: "Very structured.", rating: 4, createdAt: new Date().toISOString() },
  ],
};

// Availability store: by tutorId
const availabilityByTutor = new Map();
const DEFAULT_RULES = {
  timezone: "Europe/Madrid",
  slotInterval: 30, // minutes
  slotStartPolicy: "hourHalf", // :00 and :30
  weekly: {
    // 0=Sun..6=Sat
    1: [{ start: "09:00", end: "17:00" }],
    2: [{ start: "09:00", end: "17:00" }],
    3: [{ start: "09:00", end: "17:00" }],
    4: [{ start: "09:00", end: "17:00" }],
    5: [{ start: "09:00", end: "17:00" }],
  },
  exceptions: [], // [{ date: "2025-09-25", closed: true }]
};

// --- Student Profile (mock, persisted) --------------------------------------
let studentProfile = JSON.parse(
  localStorage.getItem("mockStudentProfile") ||
    '{"level":"","goals":"","interests":""}'
);
function persistStudentProfile() {
  try {
    localStorage.setItem("mockStudentProfile", JSON.stringify(studentProfile));
  } catch {}
}

// --- Lessons (in-memory) ----------------------------------------------------
const lessonsStore = new Map();

function genId(prefix = "L") {
  return (
    prefix +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}

const TRIAL_LIMIT_TOTAL = 3;
const TRIAL_LIMIT_PER_TUTOR = 1;

function lsGetNumber(key, fallback = 0) {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : Number(fallback) || 0;
  } catch {
    return Number(fallback) || 0;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

// --- Mock Auth (in-memory) --------------------------------------------------
const users = new Map(); // email -> user

function genUserId() {
  return "U" + Math.random().toString(36).slice(2, 9);
}

function ensureUser(email, role = "student", name = "") {
  const key = String(email || "").toLowerCase().trim();
  if (!key) return null;
  if (!users.has(key)) {
    users.set(key, {
      id: genUserId(),
      email: key,
      role,
      name: name || key.split("@")[0],
      bio: "",
      subjects: [],
      price: 0, // cents
      createdAt: new Date().toISOString(),
    });
  }
  return users.get(key);
}

function getAuthUser(options) {
  try {
    const h = options?.headers || {};
    const auth = h.Authorization || h.authorization || "";
    if (!String(auth).toLowerCase().startsWith("bearer ")) return null;
    // Return the first user or a demo user
    return users.values().next().value || { id: "Udemo", email: "demo@example.com", role: "student", name: "Demo", bio: "", subjects: [], price: 0 };
  } catch {
    return null;
  }
}

// --- Utilities --------------------------------------------------------------

const clone = (obj) => JSON.parse(JSON.stringify(obj));

function parseUrl(url) {
  const base = "http://local.mock";
  const u = new URL(url, base);
  return { pathname: u.pathname, search: u.searchParams };
}
function summaryForTutor(tutorId) {
  const list = reviews[tutorId] || [];
  const count = list.length;
  const avg = count
    ? Math.round((list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count) * 10) / 10
    : 0;
  return { avgRating: avg, reviewsCount: count };
}

function withSummary(t) {
  const { avgRating, reviewsCount } = summaryForTutor(t.id);
  return { ...t, avgRating, reviewsCount };
}

// Parse "HH:MM" → minutes from midnight
function hmToMin(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Get rules for a date (YYYY-MM-DD) considering exceptions
function rulesForDate(rules, y, m, d) {
  const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const ex = (rules.exceptions || []).find((e) => e.date === dateStr);
  if (ex) {
    if (ex.closed) return [];
    if (Array.isArray(ex.slots)) return ex.slots;
  }
  const weekday = new Date(Date.UTC(y, m, d)).getUTCDay(); // 0..6
  return rules.weekly[weekday] || [];
}

// Generate slots between from→to (ISO strings)
function generateSlots(rules, fromISO, toISO, durMin /* minutes */, tz) {
  // Mock ignores tz/DST; returns ISO UTC starts.
  const from = new Date(fromISO);
  const to = new Date(toISO);
  if (isNaN(from) || isNaN(to)) return [];

  const slotInterval = Number(rules.slotInterval || 30);
  const out = [];

  let day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const endDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  while (day <= endDay) {
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth();
    const d = day.getUTCDate();

    const windows = rulesForDate(rules, y, m, d); // [{start,end}]
    for (const w of windows) {
      const startMin = hmToMin(w.start);
      const endMin = hmToMin(w.end);

      let curMin = startMin;
      if (rules.slotStartPolicy === "hourHalf") {
        const mod = curMin % 30;
        if (mod !== 0) curMin += 30 - mod;
      }

      while (curMin + durMin <= endMin) {
        const h = Math.floor(curMin / 60);
        const mi = curMin % 60;
        const slotStart = new Date(Date.UTC(y, m, d, h, mi, 0));
        if (slotStart >= from && slotStart < to) {
          out.push(slotStart.toISOString());
        }
        curMin += slotInterval;
      }
    }

    day = new Date(Date.UTC(y, m, d + 1));
  }

  return out;
}

// --- Mock HTTP Handler ------------------------------------------------------

export async function handle(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const { pathname, search } = parseUrl(url);

  // GET /api/tutors  (supports ?page=&limit=)
  if (method === "GET" && pathname === "/api/tutors") {
    const page = Math.max(1, Number(search.get("page") || 1));
    const limit = Math.max(1, Number(search.get("limit") || 50));
    const start = (page - 1) * limit;
    const pageRows = tutors.slice(start, start + limit);
    const payload = {
      data: pageRows.map((t) => withSummary(t)),
      total: tutors.length,
      page,
      limit,
    };
    return mockResponse(payload);
  }

  // GET /api/tutors/:id
  if (method === "GET" && pathname.startsWith("/api/tutors/")) {
    const id = pathname.split("/").pop();
    const t = tutors.find((x) => x.id === id);
    if (!t) return mockError("Tutor not found", 404);
    return mockResponse(withSummary(t));
  }

  // GET /api/reviews/tutor/:id (list)
  if (method === "GET" && pathname.startsWith("/api/reviews/tutor/") && !pathname.endsWith("/summary")) {
    const id = pathname.split("/").pop();
    return mockResponse(reviews[id] || []);
  }

  // GET /api/reviews/tutor/:id/summary
  if (method === "GET" && pathname.endsWith("/summary")) {
    const id = pathname.split("/").slice(-2, -1)[0];
    const s = summaryForTutor(id);
    return mockResponse(s);
  }

  // --- Availability ---------------------------------------------------------

  // PUT /api/availability  (save)
  if (method === "PUT" && pathname === "/api/availability") {
    try {
      const body = await readJson(options);
      const tutorId = body?.tutorId || body?.tutor || body?.id;
      if (!tutorId) return mockError("tutorId required", 400);

      const current = availabilityByTutor.get(tutorId) || clone(DEFAULT_RULES);
      const next = {
        ...current,
        ...body, // may override timezone, slotInterval, slotStartPolicy, weekly, exceptions
      };
      availabilityByTutor.set(tutorId, next);
      return mockResponse({ ok: true, saved: true, rules: next });
    } catch (e) {
      return mockError(e.message || "Bad JSON", 400);
    }
  }

  // GET /api/availability/:tutorId (load rules)
  if (method === "GET" && pathname.startsWith("/api/availability/") && !pathname.endsWith("/slots")) {
    const tutorId = pathname.split("/").pop();
    const rules = availabilityByTutor.get(tutorId) || clone(DEFAULT_RULES);
    return mockResponse(rules);
  }

  // GET /api/availability/:tutorId/slots?from&to&dur&tz
  if (method === "GET" && pathname.includes("/api/availability/") && pathname.endsWith("/slots")) {
    const parts = pathname.split("/");
    const theTutorId = parts[parts.length - 2]; // <<< FIXED
    const rules = availabilityByTutor.get(theTutorId) || clone(DEFAULT_RULES);

    const from = search.get("from");
    const to = search.get("to");
    const dur = Math.max(15, Number(search.get("dur") || 30)); // minutes
    const tz = search.get("tz") || rules.timezone || "Europe/Madrid";

    if (!from || !to) return mockError("from and to are required ISO strings", 400);

    const slots = generateSlots(rules, from, to, dur, tz);
    return mockResponse({ tutorId: theTutorId, from, to, dur, tz, slots });
  }

  // --- Lessons --------------------------------------------------------------
  // POST /api/lessons  (mock booking)
  if (method === "POST" && pathname === "/api/lessons") {
    try {
      const body = await readJson(options);
      const { tutorId, start, duration, isTrial, notes } = body || {};

      if (!tutorId || !start || !duration) {
        return mockError("tutorId, start (ISO) and duration (minutes) are required", 400);
      }

      // must be logged in to book
      const me = getAuthUser(options);
      if (!me) return mockError("Unauthorized", 401);

      const tutor = tutors.find((t) => t.id === String(tutorId));
      if (!tutor) return mockError("Tutor not found", 404);

      // Basic ISO validation
      const startDate = new Date(start);
      if (isNaN(startDate)) return mockError("Invalid start datetime", 400);

      // Trials supported in mock mode; paid bookings blocked (no payments)
      if (!isTrial) {
        return mockError(
          "Payments are disabled in mock mode. Enable real payments to book non-trial lessons.",
          400
        );
      }

      // Enforce trial limits via localStorage
      const totalUsed = lsGetNumber("mockTrialsTotal", 0);
      const perTutorKey = `mockTrialsByTutor:${tutorId}`;
      const usedWithTutor = lsGetNumber(perTutorKey, 0);

      if (totalUsed >= TRIAL_LIMIT_TOTAL) {
        return mockError("Trial limit reached (max 3 total).", 400);
      }
      if (usedWithTutor >= TRIAL_LIMIT_PER_TUTOR) {
        return mockError("Trial limit reached for this tutor (max 1).", 400);
      }

      // include student identity on the lesson
      const _id = genId();
      const lesson = {
        _id,
        tutorId: String(tutorId),
        tutorName: tutor.name,
        studentId: me.id,
        studentName: me.name || me.email,
        start: startDate.toISOString(),
        duration: Number(duration),
        isTrial: true,
        price: 0,
        status: "confirmed",
        subject: "English (Trial)",
        notes: typeof notes === "string" ? notes.slice(0, 300) : "",
        createdAt: new Date().toISOString(),
      };
      lessonsStore.set(_id, lesson);

      // Update counters
      lsSet("mockTrialsTotal", totalUsed + 1);
      lsSet(perTutorKey, usedWithTutor + 1);

      return mockResponse(lesson, 201);
    } catch (e) {
      return mockError(e.message || "Invalid JSON", 400);
    }
  }

  // GET /api/lessons/:id
  if (method === "GET" && pathname.startsWith("/api/lessons/") && pathname !== "/api/lessons/mine") {
    const id = pathname.split("/").pop();
    if (!lessonsStore.has(id)) return mockError("Lesson not found", 404);
    return mockResponse(lessonsStore.get(id));
  }

  // --- Lessons: list mine (mock) -------------------------------------------
  // GET /api/lessons/mine  → lessons for logged-in student, normalized; seed if empty
  if (method === "GET" && pathname === "/api/lessons/mine") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);

    // pick/seed user lessons
    let mine = [...lessonsStore.values()].filter((l) => l.studentId === me.id);

    if (mine.length === 0) {
      // seed one example trial lesson for this user so the page isn't empty
      const t = tutors[0];
      const _id = genId();
      const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // +2 days
      const duration = 60;
      const seed = {
        _id,
        tutorId: t.id,
        tutorName: t.name,
        studentId: me.id,
        studentName: me.name || me.email,
        start: start.toISOString(),
        duration,
        status: "confirmed",
        isTrial: true,
        price: 0,
        subject: "English (Trial)",
        notes: "",
        createdAt: new Date().toISOString(),
      };
      lessonsStore.set(_id, seed);
      mine = [seed];
    }

    // normalize/shape for client compatibility
    const list = mine
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .map((l) => {
        const t = tutors.find((x) => x.id === l.tutorId);
        const startDate = new Date(l.start);
        const endISO = isFinite(l.duration)
          ? new Date(startDate.getTime() + Number(l.duration) * 60000).toISOString()
          : l.start;

        return {
          // core
          _id: l._id,
          tutorId: l.tutorId,
          tutorName: l.tutorName || (t ? t.name : "Tutor"),
          start: l.start, // also provide startTime/endTime for older pages
          duration: l.duration,
          status: l.status,
          isTrial: !!l.isTrial,
          price: l.price,

          // alt/compat fields
          startTime: l.start,
          endTime: endISO,

          // extras
          subject: l.subject || "",
          notes: l.notes || "",
          tutor: t ? { _id: t.id, name: t.name } : { _id: l.tutorId, name: "Tutor" },
        };
      });

    return mockResponse(list);
  }

  // --- Lessons: trials summary (mock) ---------------------------------------
  // GET /api/lessons/trials/summary?tutorId=...
  if (method === "GET" && pathname === "/api/lessons/trials/summary") {
    const tutorId = String(search.get("tutorId") || "");
    const totalUsed = lsGetNumber("mockTrialsTotal", 0);
    const usedWithTutor = tutorId ? lsGetNumber(`mockTrialsByTutor:${tutorId}`, 0) : 0;
    return mockResponse({
      totalUsed,
      usedWithTutor,
      limitTotal: TRIAL_LIMIT_TOTAL,
      limitPerTutor: TRIAL_LIMIT_PER_TUTOR,
    });
  }

  // --- Reviews (mock write + can-review) ------------------------------------
  // GET /api/reviews/can-review?tutorId=...
  if (method === "GET" && pathname === "/api/reviews/can-review") {
    const tutorId = search.get("tutorId");
    if (!tutorId || !tutors.find(t => t.id === String(tutorId))) {
      return mockResponse({ canReview: false });
    }
    const me = getAuthUser(options);
    return mockResponse({ canReview: !!me });
  }

  // POST /api/reviews  → { tutorId, rating, text }
  if (method === "POST" && pathname === "/api/reviews") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);

    const body = await readJson(options);
    const tutorId = String(body?.tutorId || "");
    const rating = Number(body?.rating);
    const text = String(body?.text || "").trim();

    if (!tutorId) return mockError("tutorId is required", 400);
    if (!tutors.find(t => t.id === tutorId)) return mockError("Tutor not found", 404);
    if (!(rating >= 1 && rating <= 5)) return mockError("rating must be 1–5", 400);
    if (text.length < 3) return mockError("text is too short", 400);

    const list = reviews[tutorId] || (reviews[tutorId] = []);
    const item = {
      id: genId("R"),
      student: me.name || me.email || "Student",
      rating,
      text,
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    return mockResponse(item, 201);
  }

  // --- Student Profile (mock endpoints) -------------------------------------
  // GET /api/student-profile
  if (method === "GET" && pathname === "/api/student-profile") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    return mockResponse(studentProfile);
  }

  // PUT /api/student-profile  → { level, goals, interests }
  if (method === "PUT" && pathname === "/api/student-profile") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const body = await readJson(options);
    studentProfile = {
      level: String(body?.level || "").trim(),
      goals: String(body?.goals || "").trim(),
      interests: String(body?.interests || "").trim(),
    };
    persistStudentProfile();
    return mockResponse(studentProfile);
  }

  // --- Auth (mock) ----------------------------------------------------------
  // POST /api/auth/login  → accepts { email, password? }, returns { token, user }
  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(options);
    const email = String(body?.email || "").trim();
    if (!email) return mockError("Email is required", 400);
    const user = ensureUser(email, "student");
    return mockResponse({ token: "mock-token", user });
  }

  // POST /api/auth/signup → { name, email, role? } returns { token, user }
  if (method === "POST" && pathname === "/api/auth/signup") {
    const body = await readJson(options);
    const email = String(body?.email || "").trim();
    const name = String(body?.name || "").trim();
    const role = (body?.role === "tutor" ? "tutor" : "student");
    if (!email) return mockError("Email is required", 400);
    const user = ensureUser(email, role, name);

    // --- NEW: seed welcome notification ---
    addNotification({
      userId: user.id,
      title: "Welcome to Lernitt!",
      body: "Your account was created successfully.",
      type: "info",
      relatedId: user.id,
    });

    return mockResponse({ token: "mock-token", user });
  }
  // GET /api/auth/check → returns { ok: true, user? } if Authorization present
  if (method === "GET" && pathname === "/api/auth/check") {
    const me = getAuthUser(options);
    if (!me) return mockResponse({ ok: false });
    return mockResponse({ ok: true, user: me });
  }

  // --- Me (mock) ------------------------------------------------------------
  // GET /api/me
  if (method === "GET" && pathname === "/api/me") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    return mockResponse({
      id: me.id,
      email: me.email,
      name: me.name,
      bio: me.bio,
      subjects: me.subjects,
      price: me.price, // cents
    });
  }

  // PATCH /api/me  → update name, bio, subjects[], price
  if (method === "PATCH" && pathname === "/api/me") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const body = await readJson(options);

    if (typeof body?.name === "string") me.name = body.name.trim();
    if (typeof body?.bio === "string") me.bio = body.bio.trim();

    if (Array.isArray(body?.subjects)) {
      me.subjects = body.subjects.map((s) => String(s).trim()).filter(Boolean);
    }

    // price: accept number (euros) or string; store cents
    if (body?.price !== undefined && body?.price !== null && body?.price !== "") {
      const n = Number(body.price);
      if (Number.isFinite(n)) {
        // treat as euros → to cents
        me.price = Math.round(n * 100);
      } else {
        // if non-numeric string, keep 0 for simplicity
        me.price = 0;
      }
    }

    return mockResponse({
      id: me.id,
      email: me.email,
      name: me.name,
      bio: me.bio,
      subjects: me.subjects,
      price: me.price,
    });
  }

  // --- Notifications (mock) -------------------------------------------------
  // GET /api/notifications
  if (method === "GET" && pathname === "/api/notifications") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    return mockResponse(listNotifications(me.id));
  }

  // PATCH /api/notifications/:id/read
  if (method === "PATCH" && pathname.startsWith("/api/notifications/") && pathname.endsWith("/read")) {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const id = pathname.split("/")[3];
    const n = markRead(id);
    if (!n || n.userId !== me.id) return mockError("Not found", 404);
    return mockResponse(n);
  }

  // --- NEW: PATCH /api/notifications/:id/unread ---
  if (method === "PATCH" && pathname.startsWith("/api/notifications/") && pathname.endsWith("/unread")) {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const id = pathname.split("/")[3];
    const n = markUnread(id);
    if (!n || n.userId !== me.id) return mockError("Not found", 404);
    return mockResponse(n);
  }

  // POST /api/notifications/mark-all-read
  if (method === "POST" && pathname === "/api/notifications/mark-all-read") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    markAllRead(me.id);
    return mockResponse({ ok: true });
  }

  // DELETE /api/notifications  (clear mine)
  if (method === "DELETE" && pathname === "/api/notifications") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    clearAll(me.id);
    return mockResponse({ ok: true });
  }

  // --- NEW: DELETE /api/notifications/:id ---
  if (method === "DELETE" && pathname.startsWith("/api/notifications/") && pathname.split("/").length === 4) {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const id = pathname.split("/").pop();
    deleteNotification(id);
    return mockResponse({ ok: true });
  }

  // --- Payouts (mock) -------------------------------------------------------
  // GET /api/payouts
  if (method === "GET" && pathname === "/api/payouts") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const list = [...listPayouts()].filter((p) => p.userId === me.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return mockResponse(list);
  }

  // POST /api/payouts  → { lessonId, amount, currency?, provider? }
  if (method === "POST" && pathname === "/api/payouts") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const body = await readJson(options);
    if (!body?.lessonId || body?.amount == null) {
      return mockError("lessonId and amount are required", 400);
    }
    const record = addPayout({
      userId: me.id, // link to current user
      lessonId: String(body.lessonId),
      amount: Number(body.amount),
      currency: body.currency || "EUR",
      provider: body.provider || "stripe",
      status: "queued",
    });

    // --- NEW: notify payout queued ---
    addNotification({
      userId: me.id,
      title: "Payout queued",
      body: "We’re processing your payout.",
      type: "payout",
      relatedId: record._id,
    });

    return mockResponse(record, 201);
  }

  // PUT /api/payouts/:id  → update status or fields
  if (method === "PUT" && pathname.startsWith("/api/payouts/")) {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const id = pathname.split("/").pop();
    const patch = await readJson(options);
    const updated = updatePayout(id, patch || {});
    if (!updated || updated.userId !== me.id) return mockError("Payout not found", 404);
    return mockResponse(updated);
  }

  // --- Refunds (mock) -------------------------------------------------------
  // GET /api/refunds
  if (method === "GET" && pathname === "/api/refunds") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const list = [...listRefunds()].filter((r) => r.userId === me.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return mockResponse(list);
  }

  // POST /api/refunds  → { lessonId, amount, currency?, provider? }
  if (method === "POST" && pathname === "/api/refunds") {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const body = await readJson(options);
    if (!body?.lessonId || body?.amount == null) {
      return mockError("lessonId and amount are required", 400);
    }
    const record = addRefund({
      userId: me.id, // link to current user
      lessonId: String(body.lessonId),
      amount: Number(body.amount),
      currency: body.currency || "EUR",
      provider: body.provider || "stripe",
      status: "queued",
    });

    // --- NEW: notify refund queued ---
    addNotification({
      userId: me.id,
      title: "Refund queued",
      body: "We’re processing your refund.",
      type: "refund",
      relatedId: record._id,
    });

    return mockResponse(record, 201);
  }

  // PUT /api/refunds/:id  → update status or fields
  if (method === "PUT" && pathname.startsWith("/api/refunds/")) {
    const me = getAuthUser(options);
    if (!me) return mockError("Unauthorized", 401);
    const id = pathname.split("/").pop();
    const patch = await readJson(options);
    const updated = updateRefund(id, patch || {});
    if (!updated || updated.userId !== me.id) return mockError("Refund not found", 404);
    return mockResponse(updated);
  }

  // Default fallback
  return mockError("No mock handler for " + pathname, 404);
}

// --- Helpers ----------------------------------------------------------------

async function readJson(options) {
  const raw = options?.body;
  if (!raw) return {};
  if (typeof raw === "string") return JSON.parse(raw);
  return raw; // already parsed
}

function mockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function mockError(message, status = 400) {
  return {
    ok: false,
    status,
    json: async () => ({ error: message }),
  };
}
