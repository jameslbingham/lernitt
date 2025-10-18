// client/src/components/StarRating.jsx
import React, { useState } from "react";

export default function StarRating({
  value = 0,            // 0–5 (can be decimal)
  onChange,             // optional: make it interactive
  size = 20,            // px
  readOnly = false,
  showValue = false,
}) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div role="radiogroup" aria-label="Rating" style={{ lineHeight: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = display >= star;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value >= star}
              disabled={readOnly}
              onMouseEnter={() => !readOnly && setHover(star)}
              onMouseLeave={() => !readOnly && setHover(null)}
              onClick={() => onChange && onChange(star)}
              style={{
                cursor: readOnly ? "default" : "pointer",
                border: "none",
                background: "transparent",
                padding: 0,
                fontSize: size,
              }}
            >
              {filled ? "★" : "☆"}
            </button>
          );
        })}
      </div>
      {showValue && (
        <span style={{ fontSize: size * 0.7 }}>{Number(value).toFixed(1)}</span>
      )}
    </div>
  );
}
