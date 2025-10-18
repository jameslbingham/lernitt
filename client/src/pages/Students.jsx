// client/src/pages/Students.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ReviewForm from "../components/ReviewForm.jsx";
import { apiFetch } from "../lib/apiFetch.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";

export default function Students() {
  const [params, setParams] = useSearchParams();

  const initialStatus = (params.get("status") || "").toLowerCase();
  const [status, setStatus] = useState(
    ["", "pending", "confirmed", "completed", "cancelled"].includes(initialStatus)
      ? initialStatus
      : ""
  );
  const [page, setPage] = useState(Number(params.get("page") || 1));
  const [limit] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(p = page, s = status) {
    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams();
      if (s) qs.set("status", s);
      qs.set("page", String(p));
      qs.set("limit", String(limit));

      const data = await apiFetch(`${API}/api/students/lessons?${qs.toString()}`);
      setRows(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));

      setParams((sp) => {
        const next = new URLSearchParams(sp);
        s ? next.set("status", s) : next.delete("status");
        next.set("page", String(p));
        return next;
      });
    } catch (e) {
      console.error(e);
      setError("Could not load your lessons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">My Lessons</h1>
        <Link
          to="/favourites"
          className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
        >
          Favourites ♥
        </Link>
      </div>

      <label className="block">
        Status:
        <select
          value={status}
          onChange={(e) => {
            const s = e.target.value;
            setStatus(s);
            setPage(1);
            load(1, s);
          }}
          className="ml-2 border p-1 rounded"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && rows.length === 0 && <div>No lessons found.</div>}

      <ul className="space-y-3">
        {rows.map((l) => (
          <li key={l._id || l.id} className="border rounded p-3">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{l.subject}</div>
                <div className="text-sm opacity-80">
                  {l.startTime ? new Date(l.startTime).toLocaleString() : ""} —{" "}
                  {l.endTime ? new Date(l.endTime).toLocaleTimeString() : ""}
                </div>
                <div className="text-sm">Status: {l.status}</div>
              </div>
              <div className="text-sm">
                Price:{" "}
                {typeof l.price === "number"
                  ? (l.price / 100).toFixed(2)
                  : Number(l.price || 0).toFixed(2)}{" "}
                {l.currency ? String(l.currency).toUpperCase() : ""}
              </div>
            </div>

            {l.status === "completed" && (
              <ReviewForm lessonId={l._id || l.id} onDone={() => load(page, status)} />
            )}
          </li>
        ))}
      </ul>

      {total > 0 && (
        <div className="flex gap-2 pt-2 items-center">
          <button
            className="border px-3 py-1 rounded"
            onClick={() => {
              const n = Math.max(1, page - 1);
              setPage(n);
              load(n, status);
            }}
            disabled={loading || page === 1}
          >
            Previous
          </button>
          <span className="px-2 py-1">
            Page {page} / {totalPages}
          </span>
          <button
            className="border px-3 py-1 rounded"
            onClick={() => {
              const n = Math.min(totalPages, page + 1);
              setPage(n);
              load(n, status);
            }}
            disabled={loading || page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
