import React from "react";

function cx(...xs) { return xs.filter(Boolean).join(" "); }

export function Input(props) {
  return <input {...props} className={cx("border rounded-lg px-3 py-2", props.className)} />;
}

export function Select(props) {
  return <select {...props} className={cx("border rounded-lg px-2 py-2", props.className)} />;
}

export function Textarea(props) {
  return <textarea {...props} className={cx("border rounded-lg px-3 py-2", props.className)} />;
}
export default Input;
