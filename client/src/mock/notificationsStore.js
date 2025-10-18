// client/src/mock/notificationsStore.js
const N_KEY = "mock_notifications";

const nowISO = () => new Date().toISOString();

const load = () => {
  try {
    const raw = localStorage.getItem(N_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const save = (list) => localStorage.setItem(N_KEY, JSON.stringify(list));

// ensure init
if (!localStorage.getItem(N_KEY)) save([]);

// helpers
const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random()));

export const listNotifications = (userId) =>
  load().filter((n) => !userId || n.userId === userId);

export const unreadCount = (userId) =>
  listNotifications(userId).filter((n) => !n.read).length;

export const addNotification = ({
  userId,
  title,
  body = "",
  type = "info", // info|payout|refund|lesson
  relatedId = null,
}) => {
  const list = load();
  const rec = {
    _id: newId(),
    userId: userId || "Udemo",
    title: String(title || "Notification"),
    body: String(body || ""),
    type,
    relatedId,
    read: false,
    createdAt: nowISO(),
  };
  list.unshift(rec);
  save(list);
  return rec;
};

export const markRead = (_id) => {
  const list = load();
  const i = list.findIndex((n) => n._id === _id);
  if (i === -1) return null;
  list[i] = { ...list[i], read: true, updatedAt: nowISO() };
  save(list);
  return list[i];
};

export const markAllRead = (userId) => {
  const list = load().map((n) =>
    userId && n.userId !== userId ? n : { ...n, read: true, updatedAt: nowISO() }
  );
  save(list);
  return true;
};

export const clearAll = (userId) => {
  const list = load().filter((n) => (userId ? n.userId !== userId : false));
  save(list);
  return true;
};

/* ---------------- New helpers ---------------- */

// Step 1: Create a new notification
export function createNotification(userId, type, message) {
  const all = load();
  const n = {
    _id: newId(),
    userId,
    title: String(type || "Notice"),
    body: String(message || ""),
    type,
    read: false,
    createdAt: nowISO(),
  };
  all.push(n);
  save(all);
  return n;
}

// Step 2: Mark notification unread
export function markUnread(_id) {
  const all = load();
  const n = all.find((x) => x._id === _id);
  if (n) {
    n.read = false;
    save(all);
  }
  return n;
}

// Step 3: Delete one notification
export function deleteNotification(_id) {
  let all = load();
  all = all.filter((x) => x._id !== _id);
  save(all);
  return true;
}

// Step 4: Clear all for a user
export function clearUserNotifications(userId) {
  let all = load();
  all = all.filter((x) => x.userId !== userId);
  save(all);
  return true;
}
