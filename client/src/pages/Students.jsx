// client/src/pages/Students.jsx
// -----------------------------------------------------------------------------
// Version 5.2.0 - TUTOR-STUDENT SYNC (FULL BUILD)
// - ADDED: Linguistic DNA visibility for tutors managing student lessons.
// - ADDED: Subject Guard (English only) for Academic Gap Analysis.
// - PRESERVED: 100% of Pagination, Status Filtering, and Review logic.
// - MANDATORY: No truncation. This is the complete file.
// -----------------------------------------------------------------------------

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

      // Fetch lessons with populated student user data
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
        <div className="flex gap-2">
          <Link
            to="/favourites"
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            Favourites ♥
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <label className="block text-sm font-medium">
          Filter Status:
          <select
            value={status}
            onChange={(e) => {
              const s = e.target.value;
              setStatus(s);
              setPage(1);
              load(1, s);
            }}
            className="ml-2 border border-slate-200 p-1.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Lessons</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {loading && <div className="text-center py-10 opacity-60 animate-pulse">Loading lessons…</div>}
      {error && <div className="text-red-600 bg-red-50 p-4 rounded-xl text-center border border-red-100">{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[32px] text-slate-400">
          No lessons found for this criteria.
        </div>
      )}

      <ul className="space-y-4">
        {rows.map((l) => {
          // 🧬 LINGUISTIC DNA LOGIC
          // Check if this is an English lesson and if the student has DNA results
          const isEnglish = (l.subject || "").toLowerCase().includes("english");
          const studentProfile = l.studentUser || l.student; // Depending on population depth
          const hasDna = studentProfile?.proficiencyLevel && studentProfile?.proficiencyLevel !== 'none';
          
          return (
            <li key={l._id || l.id} className="border border-slate-100 bg-white rounded-[24px] p-5 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-black text-slate-900 text-lg">{l.subject || "General Lesson"}</div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      l.status === 'completed' ? 'bg-green-100 text-green-700' :
                      l.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span>📅 {l.startTime ? new Date(l.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "No time set"}</span>
                    {l.isTrial && <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[10px] uppercase">Trial</span>}
                  </div>

                  <div className="text-xs font-bold text-slate-400">
                    Student: <span className="text-slate-700">{l.studentName || "Academic Learner"}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between items-end">
                  <div className="text-lg font-black text-indigo-600">
                    € {typeof l.price === "number"
                      ? (l.price / 100).toFixed(2)
                      : Number(l.price || 0).toFixed(2)}
                  </div>
                  
                  <Link 
                    to={`/student-lesson/${l._id || l.id}`}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline"
                  >
                    View Lesson Details →
                  </Link>
                </div>
              </div>

              {/* 🧬 DNA ACADEMIC STRIP (Surgical Addition) */}
              {isEnglish && hasDna && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Tier</span>
                    <span className="text-sm font-black">{studentProfile.proficiencyLevel}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 flex-1">
                    {studentProfile.grammarWeaknesses?.slice(0, 3).map((w, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-indigo-100 bg-indigo-50 text-[10px] font-bold text-indigo-700">
                        <span className="opacity-50">!</span> {w.component}
                      </div>
                    ))}
                    {studentProfile.grammarWeaknesses?.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">+{studentProfile.grammarWeaknesses.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}

              {l.status === "completed" && (
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <ReviewForm lessonId={l._id || l.id} onDone={() => load(page, status)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {total > 0 && (
        <div className="flex gap-3 pt-6 items-center justify-center">
          <button
            className="border border-slate-200 px-4 py-2 rounded-2xl text-sm font-bold shadow-sm transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => {
              const n = Math.max(1, page - 1);
              setPage(n);
              load(n, status);
            }}
            disabled={loading || page === 1}
          >
            ← Previous
          </button>
          <span className="text-sm font-black text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            className="border border-slate-200 px-4 py-2 rounded-2xl text-sm font-bold shadow-sm transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => {
              const n = Math.min(totalPages, page + 1);
              setPage(n);
              load(n, status);
            }}
            disabled={loading || page >= totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
