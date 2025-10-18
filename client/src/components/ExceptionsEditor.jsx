import { useState } from "react";

function RangeRow({ idx, value, onChange, onRemove }) {
  return (
    <div className="range-row" style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <input
        type="time"
        value={value.start}
        onChange={(e) => onChange(idx, { ...value, start: e.target.value })}
      />
      <span>to</span>
      <input
        type="time"
        value={value.end}
        onChange={(e) => onChange(idx, { ...value, end: e.target.value })}
      />
      <button type="button" onClick={() => onRemove(idx)}>Remove</button>
    </div>
  );
}

export default function ExceptionsEditor({ exceptions = [], onAdd, onDelete }) {
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(true);
  const [ranges, setRanges] = useState([{ start: "09:00", end: "12:00" }]);
  const canAdd = date && (open ? ranges.every(r => r.start && r.end) : true);

  const addRange = () => setRanges([...ranges, { start: "13:00", end: "17:00" }]);
  const changeRange = (i, v) => setRanges(ranges.map((r, idx) => (idx === i ? v : r)));
  const removeRange = (i) => setRanges(ranges.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!canAdd) return;
    onAdd?.({ date, open, ranges: open ? ranges : [] });
    // reset
    setDate("");
    setOpen(true);
    setRanges([{ start: "09:00", end: "12:00" }]);
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Date-specific exceptions</h3>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <label>Date: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>

        <label>
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
          />{" "}
          Open on this date
        </label>
      </div>

      {open && (
        <div style={{ marginBottom: 8 }}>
          {ranges.map((r, i) => (
            <RangeRow
              key={i}
              idx={i}
              value={r}
              onChange={changeRange}
              onRemove={removeRange}
            />
          ))}
          <button type="button" onClick={addRange}>Add time range</button>
        </div>
      )}

      <button type="button" disabled={!canAdd} onClick={submit}>
        Add/Update exception
      </button>

      <hr style={{ margin: "12px 0" }} />

      <ul style={{ paddingLeft: 18, margin: 0 }}>
        {exceptions.length === 0 && <li>No exceptions yet.</li>}
        {exceptions.map((e) => (
          <li key={e.date} style={{ marginBottom: 6 }}>
            <strong>{e.date}</strong> — {e.open ? "Open" : "Closed"}
            {e.open && e.ranges?.length > 0 && (
              <>: {e.ranges.map(r => `${r.start}-${r.end}`).join(", ")}</>
            )}
            {" "}
            <button type="button" onClick={() => onDelete?.(e.date)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
