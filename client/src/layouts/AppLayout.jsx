// client/src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";

export default function AppLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <Header />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px" }}>
        <Outlet />
      </main>
    </div>
  );
}
