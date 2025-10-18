// client/src/components/Toaster.jsx
import { useEffect, useState } from "react";

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const t = e.detail;
      setToasts((prev) => [...prev, t]);
      // auto-remove
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.duration || 2500);
    }
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className="fixed z-[9999] right-3 bottom-3 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "max-w-xs rounded-2xl shadow-lg border px-3 py-2 text-sm backdrop-blur bg-white/90",
            t.type === "success"
              ? "border-green-300"
              : t.type === "error"
              ? "border-red-300"
              : "border-gray-200",
          ].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

