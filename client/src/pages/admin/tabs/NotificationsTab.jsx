// client/src/pages/admin/tabs/NotificationsTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import AdminTable from "./AdminTableShim.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

// Safe fetch with JWT + mock fallback
async function safeFetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const r = await fetch(url, { headers, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    return text ? JSON.parse(text) : { ok: true };
  } catch (e) {
    if (!IS_MOCK) throw e;

    // ---------- MOCK FALLBACKS ----------
    if (url.endsWith("/api/notifications") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          {
            id: "N1",
            title: "Welcome!",
            body: "Thanks for joining.",
            audience: "all",
            status: "sent",
            createdAt: "2025-09-30T09:00:00Z",
          },
          {
            id: "N2",
            title: "Payout Delay",
            body: "Expect payouts tomorrow.",
            audience: "tutors",
            status: "sent",
            createdAt: "2025-09-30T10:00:00Z",
          },
        ],
      };
    }

    if (url.endsWith("/api/notifications") && opts.method === "POST") {
      const body = opts?.body ? JSON.parse(opts.body) : {};
      return {
        ok: true,
        item: {
          id: `N${Date.now()}`,
          ...body,
          status: "sent",
          createdAt: new Date().toISOString(),
        },
      };
    }

    if (url.includes("/api/notifications/") && url.endsWith("/resend")) {
      return { ok: true };
    }

    if (url.includes("/api/notifications/") && opts.method === "DELETE") {
      return { ok: true };
    }

    return { ok: true };
  }
}

function formatDate(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function NotificationsTab({ rows = [], columns = [], ...rest }) {
  // === Keep old AdminTable passthrough ===
  const hasExternal = Array.isArray(rows) && rows.length && Array.isArray(columns) && columns.length;
  if (hasExternal) {
    return <AdminTable rows={rows} columns={columns} {...rest} />;
  }

  // === State ===
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");

  // send form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("");
  const [template, setTemplate] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await safeFetchJSON(`${API}/api/notifications`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    setNotifications(items);
    setLoading(false);
  }

  async function sendNotification() {
    if (!title.trim() || !body.trim() || !audience) return;
    const res = await safeFetchJSON(`${API}/api/notifications`, {
      method: "POST",
      body: JSON.stringify({ title, body, audience }),
    });
    const n =
      res?.item ||
      ({
        id: `N${Date.now()}`,
        title,
        body,
        audience,
        status: "sent",
        createdAt: new Date().toISOString(),
      });
    setNotifications((xs) => [n, ...xs]);
    setTitle("");
    setBody("");
    setAudience("");
    setTemplate("");
  }

  async function resendNotification(id) {
    await safeFetchJSON(`${API}/api/notifications/${id}/resend`, { method: "POST" });
  }

  async function deleteNotification(id) {
    await safeFetchJSON(`${API}/api/notifications/${id}`, { method: "DELETE" });
    setNotifications((xs) => xs.filter((n) => n.id !== id));
  }

  function exportCSV() {
    const csv = [
      ["ID", "Title", "Body", "Audience", "Status", "CreatedAt"],
      ...notifications.map((n) => [n.id, n.title, n.body, n.audience, n.status, n.createdAt]),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notifications.csv";
    a.click();
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return notifications;
    return notifications.filter((n) => JSON.stringify(n).toLowerCase().includes(qq));
  }, [notifications, q]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: create + filters */}
      <div className="lg:col-span-1 space-y-4">
        {/* Send form */}
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Send Notification</h2>

          {/* Audience presets */}
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="border rounded px-2 py-1 w-full mb-2"
          >
            <option value="">Choose audience</option>
            <option value="all">All users</option>
            <option value="students">All students</option>
            <option value="tutors">All tutors</option>
            <option value="singleStudent">Specific student</option>
            <option value="singleTutor">Specific tutor</option>
          </select>

          {/* Template select (NEW: 4 templates) */}
          <select
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              if (e.target.value === "welcome") {
                setTitle("Welcome to Lernitt!");
                setBody("We’re excited to have you learning with us. Explore tutors, book your first lesson, and enjoy the journey!");
              }
              if (e.target.value === "lessonReminder") {
                setTitle("Lesson Reminder");
                setBody("Don’t forget—your lesson is coming up soon. Please check your Lernitt dashboard for details and join on time.");
              }
              if (e.target.value === "missedLesson") {
                setTitle("Missed Lesson");
                setBody("We noticed you missed your lesson. Please reschedule with your tutor or contact support if you need help.");
              }
              if (e.target.value === "payoutReminder") {
                setTitle("Payout Reminder");
                setBody("Payouts are processed every Monday. Please make sure your payment details are up to date in your Lernitt account.");
              }
            }}
            className="border rounded px-2 py-1 w-full mb-2"
          >
            <option value="">Choose template</option>
            <option value="welcome">Welcome</option>
            <option value="lessonReminder">Lesson Reminder</option>
            <option value="missedLesson">Missed Lesson</option>
            <option value="payoutReminder">Payout Reminder</option>
          </select>

          {/* Title/body inputs */}
          <div className="space-y-2">
            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="border rounded px-2 py-1 w-full"
              placeholder="Message body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button className="px-3 py-1 border rounded" onClick={sendNotification}>
              Send
            </button>
          </div>
        </div>

        {/* Search + export */}
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Tools</h2>
          <input
            type="text"
            className="border rounded px-2 py-1 mb-2 w-full"
            placeholder="Search notifications…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="px-3 py-1 border rounded w-full" onClick={exportCSV}>
            Export CSV
          </button>
          <button
            className="px-3 py-1 border rounded w-full mt-2"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Loading…" : "Reload"}
          </button>
        </div>
      </div>

      {/* Right: list */}
      <div className="lg:col-span-2">
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-3">Notifications</h2>
          {loading ? (
            <div>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-600">No notifications found.</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((n) => (
                <li key={n.id} className="border rounded-xl p-3">
                  <div className="flex justify-between">
                    <div className="font-semibold">
                      {n.title} <span className="text-xs text-gray-500">#{n.id}</span>
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(n.createdAt)}</div>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{n.body}</div>
                  <div className="flex gap-2 text-xs mt-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 border text-blue-800">
                      {n.audience}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-green-50 border text-green-800">
                      {n.status}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => resendNotification(n.id)}
                    >
                      Resend
                    </button>
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => deleteNotification(n.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
