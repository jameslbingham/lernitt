import { useEffect, useState } from "react";

export default function Toast({ msg, onDone, ms = 1600 }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => (setShow(false), onDone?.()), ms);
    return () => clearTimeout(t);
  }, [ms, onDone]);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg shadow px-3 py-2 bg-black/80 text-white text-sm z-50">
      {msg}
    </div>
  );
}
