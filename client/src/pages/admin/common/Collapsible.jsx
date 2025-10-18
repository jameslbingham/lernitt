import React, { useState } from "react";
import { Btn } from "./Buttons.jsx";

export default function Collapsible({ title, startOpen = false, children }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="border rounded-2xl bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="font-semibold">{title}</div>
        <Btn onClick={() => setOpen(v => !v)}>{open ? "Hide" : "Show"}</Btn>
      </div>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}
