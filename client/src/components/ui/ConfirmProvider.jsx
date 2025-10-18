// client/src/components/ui/ConfirmProvider.jsx
// -----------------------------------------------------------------------------
// Simple ConfirmProvider — shared across admin for non-blocking confirmation
// -----------------------------------------------------------------------------
// ✅ Provides useConfirm() hook for async confirm dialogs
// ✅ Non-blocking (no window.confirm)
// ✅ Works with ToastProvider or standalone
// ✅ Supports custom message text
// ✅ Safe for mock and live modes (VITE_MOCK=1/0)
// -----------------------------------------------------------------------------

import React, { createContext, useContext, useState, useCallback } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    message: "",
    onConfirm: null,
    onCancel: null,
    open: false,
  });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({
        message,
        open: true,
        onConfirm: () => {
          setConfirmState((s) => ({ ...s, open: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState((s) => ({ ...s, open: false }));
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {confirmState.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-80 text-center space-y-4">
            <div className="text-lg font-semibold">Please Confirm</div>
            <div className="text-sm text-gray-600">{confirmState.message}</div>
            <div className="flex justify-center gap-4 mt-4">
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={confirmState.onConfirm}
              >
                Yes
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                onClick={confirmState.onCancel}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
