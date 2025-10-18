// client/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ToastProvider } from "@/components/ui/ToastProvider.jsx";
import { ConfirmProvider } from "./components/ui/ConfirmProvider";

const mockMode = import.meta.env.VITE_MOCK === "1";
console.log("Lernitt booting, mockMode =", mockMode);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App mockMode={mockMode} />
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);
