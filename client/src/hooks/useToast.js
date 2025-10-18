// client/src/hooks/useToast.js
export function useToast() {
  return (message, opts = {}) => {
    if (!message) return;
    const detail = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message: String(message),
      type: opts.type || "info", // "info" | "success" | "error"
      duration: typeof opts.duration === "number" ? opts.duration : 2500,
    };
    window.dispatchEvent(new CustomEvent("app:toast", { detail }));
  };
}

export default useToast;
