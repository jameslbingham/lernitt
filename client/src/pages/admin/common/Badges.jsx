// client/src/pages/admin/common/Badges.jsx
import React from "react";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/** Minimal, dependency-free badge component. */
export function Badge({ color = "gray", children, title, className }) {
  const palette = {
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    green: "bg-green-100 text-green-800 border-green-200",
    red: "bg-red-100 text-red-800 border-red-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    slate: "bg-slate-100 text-slate-800 border-slate-200",
  };
  return (
    <span
      title={title}
      className={cx(
        "inline-block px-2 py-0.5 text-xs rounded-full border align-middle whitespace-nowrap",
        palette[color] || palette.gray,
        className
      )}
      aria-label={typeof children === "string" ? children : title || "badge"}
    >
      {children}
    </span>
  );
}

export default Badge;
