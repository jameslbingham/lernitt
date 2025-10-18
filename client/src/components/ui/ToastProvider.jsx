// client/src/components/ui/ToastProvider.jsx
// -----------------------------------------------------------------------------
// Provides app-wide toast notifications and confirmation modals.
// Works in both mock and live mode. Lightweight, no dependencies.
// Usage:
//   import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
//   ...
//   const { toast, confirm } = useToast();
//   toast("Saved!");
//   const ok = await confirm("Approve this refund?");
// -----------------------------------------------------------------------------

import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/* ------------------------------- Context ------------------------------- */

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

/* ----------------------------- Provider ----------------------------- */

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // {message, resolve}

  const toast = useCallback((message, type = "info", duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), duration);
  }, []);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = (ok) => {
    if (confirmState?.resolve) confirmState.resolve(ok);
    setConfirmState(null);
  };

  const value = { toast, confirm };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <>
          {/* --- Toasts --- */}
          <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`px-4 py-2 rounded-lg shadow text-white transition ${
                  t.type === "success"
                    ? "bg-green-600"
                    : t.type === "error"
                    ? "bg-red-600"
                    : t.type === "warning"
                    ? "bg-yellow-600"
                    : "bg-gray-800"
                }`}
              >
                {t.message}
              </div>
            ))}
          </div>

          {/* --- Confirm Modal --- */}
          {confirmState && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 w-80 text-center">
                <p className="mb-6 text-gray-800">{confirmState.message}</p>
                <div className="flex justify-center gap-4">
                  <button
                    className="px-4 py-1 rounded bg-green-600 text-white"
                    onClick={() => handleConfirm(true)}
                  >
                    OK
                  </button>
                  <button
                    className="px-4 py-1 rounded bg-gray-300"
                    onClick={() => handleConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
