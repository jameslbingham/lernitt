// client/src/components/SlotPicker.jsx
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API || "http://localhost:5000";

export default function SlotPicker({
  tutorId,
  date,              // "YYYY-MM-DD"
  duration = 60,     // minutes
  selectedISO,
  onSelect,          // (iso) => void
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  useEffect(() => {
    if (!tutorId || !date) {
      setSlots([]);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const q = new URLSearchParams({
          from: date,
          to: date,
          dur: String(duration),
          tz,
        });
        const r = await fetch(`${API}/api/availability/${encodeURIComponent(tutorId)}/slots?` + q.toString());
        if (!r.ok) throw new Error("Failed to load slots");
        const data = await r.json();
        if (alive) setSlots(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setErr("Could not load slots.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tutorId, date, duration, tz]);

  return (
    <div className="space-y-2">
      <div className="text-sm opacity-70">
        Times shown in <b>{tz}</b>
      </div>

      {loading && <div className="text-sm">Loading slots…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {!loading && !err && slots.length === 0 && (
        <div className="text-sm opacity-70">No slots for this day.</div>
      )}

      <div className="flex flex-wrap gap-2">
        {slots.map((iso) => {
          const d = new Date(iso);
          const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const active = selectedISO === iso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect?.(iso)}
              className={`px-3 py-1 rounded-2xl border shadow-sm hover:shadow-md transition text-sm ${
                active ? "bg-blue-600 text-white" : "bg-white"
              }`}
              title={new Date(iso).toLocaleString()}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
