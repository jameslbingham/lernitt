import React, { useState } from "react";
import { Btn } from "./Buttons.jsx";

export function useConfirm() {
  const [state, setState] = useState({ open: false, title: "", msg: "", onConfirm: null });
  function confirm({ title, msg, onConfirm }) { setState({ open: true, title, msg, onConfirm }); }
  function close() { setState(s => ({ ...s, open: false })); }
  const ConfirmUI = !state.open ? null : (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border shadow-xl max-w-md w-full">
        <div className="px-4 py-3 border-b font-semibold">{state.title}</div>
        <div className="px-4 py-3 text-sm">{state.msg}</div>
        <div className="px-4 py-3 border-t flex gap-2 justify-end">
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="danger" onClick={() => { state.onConfirm?.(); close(); }}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
  return { confirm, ConfirmUI };
}
