// client/src/pages/admin/tabs/Support.jsx
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

async function safeFetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const baseHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const r = await fetch(url, { headers: baseHeaders, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    return text ? JSON.parse(text) : { ok: true };
  } catch (e) {
    if (!IS_MOCK) throw e;

    // ---- MOCK FALLBACKS ----
    if (url.endsWith("/api/support") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          {
            id: "S1",
            user: { id: "u1", name: "Alice Student", email: "alice@example.com" },
            subject: "Refund question",
            message: "I think I was double charged.",
            status: "open",
            priority: "normal",
            assignee: null,
            notes: [],
            createdAt: "2025-09-30T10:00:00Z",
          },
          {
            id: "S2",
            user: { id: "u2", name: "Bob Tutor", email: "bob@example.com" },
            subject: "Payout delay",
            message: "Payout not arrived yet.",
            status: "pending",
            priority: "high",
            assignee: { id: "admin1", name: "Admin" },
            notes: [{ by: "admin1", at: "2025-09-30T12:00:00Z", text: "Investigating." }],
            createdAt: "2025-09-30T11:30:00Z",
          },
        ],
      };
    }
    if (url.includes("/api/support/") && url.endsWith("/respond")) {
      return { ok: true };
    }
    return { ok: true };
  }
}

function formatDate(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState("normal");

  const [noteText, setNoteText] = useState({});
  const [assignee, setAssignee] = useState({});

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await safeFetchJSON(`${API}/api/support`);
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setTickets(items);
    } catch (e) {
      console.error(e);
      alert("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  async function createTicket() {
    if (!newSubject.trim() || !newMessage.trim()) return;
    const body = { subject: newSubject.trim(), message: newMessage.trim(), priority: newPriority };
    try {
      await safeFetchJSON(`${API}/api/support`, { method: "POST", body: JSON.stringify(body) });
      const t = {
        id: `S${Date.now()}`,
        user: { id: "me" },
        subject: newSubject.trim(),
        message: newMessage.trim(),
        status: "open",
        priority: newPriority,
        assignee: null,
        notes: [],
        createdAt: new Date().toISOString(),
      };
      setTickets((xs) => [t, ...xs]);
      setNewSubject("");
      setNewMessage("");
      setNewPriority("normal");
    } catch (e) {
      console.error(e);
      alert("Create failed.");
    }
  }

  async function updateStatus(id, next) {
    try {
      await safeFetchJSON(`${API}/api/support/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setTickets((xs) => xs.map((t) => (t.id === id ? { ...t, status: next } : t)));
    } catch (e) {
      console.error(e);
      alert("Update status failed.");
    }
  }

  async function assign(id) {
    const assigneeId = (assignee[id] || "").trim() || null;
    try {
      await safeFetchJSON(`${API}/api/support/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeId }),
      });
      setTickets((xs) =>
        xs.map((t) => (t.id === id ? { ...t, assignee: assigneeId ? { id: assigneeId } : null } : t))
      );
    } catch (e) {
      console.error(e);
      alert("Assign failed.");
    }
  }

  async function addNote(id) {
    const text = (noteText[id] || "").trim();
    if (!text) return;
    try {
      const res = await safeFetchJSON(`${API}/api/support/${id}/note`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const note = res?.note || { by: "admin", at: new Date().toISOString(), text };
      setTickets((xs) =>
        xs.map((t) => (t.id === id ? { ...t, notes: [...(t.notes || []), note] } : t))
      );
      setNoteText((m) => ({ ...m, [id]: "" }));
    } catch (e) {
      console.error(e);
      alert("Add note failed.");
    }
  }

  async function respondTicket(id) {
    const message = window.prompt("Type response:");
    if (!message) return;
    try {
      await safeFetchJSON(`${API}/api/support/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      alert("Response sent");
    } catch (e) {
      console.error(e);
      alert("Respond failed.");
    }
  }

  // CSV export
  function exportCSV() {
    const csv = [
      ["ID", "Subject", "Message", "Status", "Priority", "User", "Assignee", "CreatedAt"],
      ...tickets.map((t) => [
        t.id,
        t.subject,
        (t.message || "").replace(/\n/g, " "),
        t.status,
        t.priority,
        t.user?.name || t.user?.id || "",
        t.assignee?.name || t.assignee?.id || "",
        t.createdAt,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tickets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    let arr = tickets;
    const qq = q.trim().toLowerCase();
    if (qq) arr = arr.filter((t) => JSON.stringify(t).toLowerCase().includes(qq));
    if (status) arr = arr.filter((t) => (t.status || "") === status);
    if (priority) arr = arr.filter((t) => (t.priority || "") === priority);
    return arr;
  }, [tickets, q, status, priority]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  function badge(text, type) {
    const base = "px-2 py-0.5 rounded-full border text-xs";
    if (type === "status") {
      if (text === "open") return <span className={`${base} bg-red-50 border-red-200 text-red-800`}>{text}</span>;
      if (text === "pending") return <span className={`${base} bg-yellow-50 border-yellow-200 text-yellow-800`}>{text}</span>;
      if (text === "resolved") return <span className={`${base} bg-green-50 border-green-200 text-green-800`}>{text}</span>;
      if (text === "closed") return <span className={`${base} bg-gray-50 border-gray-200 text-gray-800`}>{text}</span>;
    }
    if (type === "priority") {
      if (text === "low") return <span className={`${base} bg-slate-50 border-slate-200 text-slate-700`}>{text}</span>;
      if (text === "normal") return <span className={`${base} bg-blue-50 border-blue-200 text-blue-700`}>{text}</span>;
      if (text === "high") return <span className={`${base} bg-orange-50 border-orange-200 text-orange-700`}>{text}</span>;
      if (text === "urgent") return <span className={`${base} bg-red-100 border-red-300 text-red-900 font-bold`}>{text}</span>;
    }
    return <span className={base}>{text}</span>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left side */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Create Ticket (test)</h2>
          <input
            className="border rounded-lg px-3 py-2 w-full mb-2"
            placeholder="Subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
          />
          <textarea
            className="border rounded-lg px-3 py-2 w-full mb-2"
            placeholder="Message"
            rows={4}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <select
            className="border rounded-lg px-2 py-2 w-full mb-3"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <button className="px-3 py-2 border rounded-lg" onClick={createTicket}>
            Create
          </button>
        </div>

        {/* Filters + tools */}
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-2">Filters</h2>
          <input
            className="border rounded-lg px-3 py-2 w-full mb-2"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="border rounded-lg px-2 py-2 w-full mb-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All status</option>
            <option value="open">open</option>
            <option value="pending">pending</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
          <select
            className="border rounded-lg px-2 py-2 w-full mb-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priority</option>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <div className="flex gap-2 mt-2">
            <button
              className="px-3 py-2 border rounded-lg"
              onClick={() => {
                setQ(""); setStatus(""); setPriority("");
              }}
            >
              Clear
            </button>
            <button className="px-3 py-2 border rounded-lg" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Reload"}
            </button>
            <button className="px-3 py-2 border rounded-lg" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="lg:col-span-2">
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-bold mb-3">Tickets</h2>
          {loading ? (
            <div>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-600">No tickets found.</div>
          ) : (
            <>
              <ul className="space-y-3">
                {paged.map((t) => (
                  <li key={t.id} className="border rounded-xl p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">
                        {t.subject} <span className="text-xs text-gray-500">#{t.id}</span>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(t.createdAt)}</div>
                    </div>
                    <div className="text-sm text-gray-800 mt-1">{t.message}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                      {badge(t.status || "open", "status")}
                      {badge(t.priority || "normal", "priority")}
                      {t.assignee ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-800">
                          assigned: {t.assignee.name || t.assignee.id}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-800">
                          unassigned
                        </span>
                      )}
                      {t.user?.name && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                          from: {t.user.name}
                        </span>
                      )}
                    </div>

                    {/* actions */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm w-16">Status</label>
                        <select
                          className="border rounded-lg px-2 py-1 flex-1"
                          value={t.status || "open"}
                          onChange={(e) => updateStatus(t.id, e.target.value)}
                        >
                          <option value="open">open</option>
                          <option value="pending">pending</option>
                          <option value="resolved">resolved</option>
                          <option value="closed">closed</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm w-16">Assign</label>
                        <input
                          className="border rounded-lg px-2 py-1 flex-1"
                          placeholder="agent id"
                          value={assignee[t.id] || ""}
                          onChange={(e) => setAssignee((m) => ({ ...m, [t.id]: e.target.value }))}
                        />
                        <button className="px-2 py-1 border rounded" onClick={() => assign(t.id)}>
                          Set
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm w-16">Note</label>
                        <input
                          className="border rounded-lg px-2 py-1 flex-1"
                          placeholder="Add internal note…"
                          value={noteText[t.id] || ""}
                          onChange={(e) => setNoteText((m) => ({ ...m, [t.id]: e.target.value }))}
                        />
                        <button className="px-2 py-1 border rounded" onClick={() => addNote(t.id)}>
                          Add
                        </button>
                      </div>
                    </div>

                    {/* quick actions */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="px-2 py-1 border rounded" onClick={() => respondTicket(t.id)}>
                        Respond
                      </button>
                      <button
                        className="px-2 py-1 border rounded"
                        disabled={(t.status || "") === "resolved"}
                        onClick={() => updateStatus(t.id, "resolved")}
                      >
                        Resolve
                      </button>
                    </div>

                    {/* notes */}
                    {Array.isArray(t.notes) && t.notes.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold mb-1">Notes</div>
                        <ul className="space-y-1 text-sm">
                          {t.notes.map((n, idx) => (
                            <li key={idx} className="border rounded-lg px-2 py-1">
                              <span className="text-gray-500 mr-2">{formatDate(n.at)}</span>
                              <b className="mr-2">{n.by}</b>
                              {n.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  className="px-3 py-1 border rounded"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span>
                  Page {page} / {totalPages}
                </span>
                <button
                  className="px-3 py-1 border rounded"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
