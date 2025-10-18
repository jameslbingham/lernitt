// /client/src/lib/toastConfirm.js
// -----------------------------------------------------------------------------
// toastConfirm.js — lightweight global fallback for toast + confirm
// ✅ Safe to use anywhere (works even if ToastProvider / ConfirmProvider missing)
// ✅ Prevents crashes in mock mode or early render phases
// ✅ Unified API: toast.success(), toast.error(), toast.info(), toast.warn()
// ✅ confirm(message) returns Promise<boolean>
// -----------------------------------------------------------------------------

// Simple console + alert based toasts (non-blocking)
function show(msg, type = "info") {
  const prefix =
    type === "success"
      ? "✅"
      : type === "error"
      ? "❌"
      : type === "warn"
      ? "⚠️"
      : "ℹ️";
  console.log(`${prefix} ${msg}`);
  try {
    // Small non-blocking browser toast
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(msg);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  } catch (_) {
    // ignore permission errors
  }
}

export const toast = {
  success: (msg) => show(msg, "success"),
  error: (msg) => show(msg, "error"),
  info: (msg) => show(msg, "info"),
  warn: (msg) => show(msg, "warn"),
};

// Simple promise-based confirm dialog (non-UI fallback)
export async function confirm(message = "Are you sure?") {
  if (typeof window === "undefined") return true;
  try {
    const res = window.confirm(message);
    return Promise.resolve(!!res);
  } catch (err) {
    console.error("Confirm fallback error:", err);
    return Promise.resolve(false);
  }
}

// Export default bundle for convenience
export default { toast, confirm };
