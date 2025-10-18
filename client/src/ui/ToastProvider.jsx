// client/src/ui/ToastProvider.jsx
// -----------------------------------------------------------------------------
// Global Toast + Confirm modal system (Mock-safe, simple, self-contained)
// Provides: useToast()  -> toast(message, type?)
//           useConfirm() -> confirm({ title, message })
// -----------------------------------------------------------------------------

import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

/* ============================= Toast Provider ============================= */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmData, setConfirmData] = useState(null);

  const toast = useCallback((message, type = "info", timeout = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeout);
  }, []);

  const confirm = useCallback(
    ({ title = "Confirm", message = "Are you sure?" }) =>
      new Promise((resolve) => setConfirmData({ title, message, resolve })),
    []
  );

  const closeConfirm = (result) => {
    if (confirmData?.resolve) confirmData.resolve(result);
    setConfirmData(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-2 rounded-xl shadow text-white text-sm transition-all ${
                t.type === "success"
                  ? "bg-green-500"
                  : t.type === "error"
                  ? "bg-red-500"
                  : t.type === "warning"
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-800"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>

        {/* Confirm Modal */}
        {confirmData && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center">
              <h2 className="text-lg font-semibold mb-2">{confirmData.title}</h2>
              <p className="text-sm text-gray-700 mb-4">{confirmData.message}</p>
              <div className="flex justify-center gap-4">
                <button
                  className="px-4 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => closeConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-1 rounded border bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => closeConfirm(true)}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

/* ============================== Hooks ============================== */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ToastProvider>");
  return ctx;
}
