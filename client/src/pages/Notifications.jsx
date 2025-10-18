// client/src/pages/Notifications.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const MOCK = import.meta.env.VITE_MOCK === "1";

function normalize(n) {
  return {
    id: n._id || n.id || String(Math.random()),
    title: n.title || n.type || "Notification",
    text: n.text || n.message || n.body || "",
    read: !!(n.read || n.seen),
    createdAt: n.createdAt || n.date || n.time || null,
  };
}

export default function Notifications() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await apiFetch("/api/notifications", { auth: true });
      const list = Array.isArray(data) ? data.map(normalize) : [];
      setRows(list);
    } catch (e) {
      if (e?.status === 401) {
        // apiFetch may throw 401 if not logged in
        nav(`/login?next=${encodeURIComponent("/notifications")}`, { replace: true });
        return;
      }
      setErr(e.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Optionally auto-refresh every 30s
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Link to="/" className="text-sm underline">← Home</Link>
      </div>

      {MOCK && (
        <div
          style={{
            background: "#ecfeff",
            color: "#083344",
            border: "1px solid #bae6fd",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          Mock mode: notifications are empty by default.
        </div>
      )}

      {loading && <div>Loading…</div>}
      {err && (
        <div className="text-red-600">
          {err}{" "}
          <button onClick={load} className="ml-2 border px-2 py-1 rounded-2xl text-sm">
            Retry
          </button>
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div className="opacity-70">No notifications.</div>
      )}

      {!loading && !err && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id} className="border rounded-2xl p-3">
              <div className="flex items-baseline gap-2">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs opacity-70 ml-auto">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </div>
              </div>
              {n.text && <div className="text-sm opacity-90 mt-1">{n.text}</div>}
              {!n.read && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Unread
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
