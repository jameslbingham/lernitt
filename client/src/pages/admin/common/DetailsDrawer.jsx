import React from "react";
import { Btn } from "./Buttons.jsx";

/** Minimal JSON drawer */
export default function DetailsDrawer({ row, onClose }) {
  if (!row) return null;
  return (
    <div className="mt-3 border rounded-2xl bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Row details</div>
        <Btn onClick={onClose}>Close</Btn>
      </div>
      <pre className="mt-2 text-xs overflow-auto max-h-96">
        {JSON.stringify(row, null, 2)}
      </pre>
    </div>
  );
}
