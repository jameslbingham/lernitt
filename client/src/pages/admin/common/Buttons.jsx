// client/src/pages/admin/common/Buttons.jsx
import React from "react";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function Btn({ children, onClick, kind="ghost", title, disabled, className, "aria-label": ariaLabel, type="button" }) {
  const styles =
    kind === "primary" ? "bg-black text-white border-black" :
    kind === "danger"  ? "bg-red-50 text-red-700 border-red-300" :
    kind === "success" ? "bg-green-50 text-green-700 border-green-300" :
    kind === "info"    ? "bg-blue-50 text-blue-700 border-blue-300" :
                         "bg-white text-gray-900 border-gray-300";
  return (
    <button
      type={type}
      className={cx("px-2 py-1 rounded-lg border text-sm", styles, disabled && "opacity-60", className)}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || title}
    >
      {children}
    </button>
  );
}

export default Btn;
