import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import { useAuth } from "../hooks/useAuth.jsx";

const API = import.meta.env.VITE_API || "https://lernitt-server.onrender.com";

export default function Signup() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student"); 
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    if (!agreeTerms) {
      setErr("Please accept the Terms to continue.");
      return;
    }

    setErr("");
    setLoading(true);

    try {
      const payload = { email, password, name, role, type: role };

      const data = await apiFetch(`${API}/api/auth/signup`, {
        method: "POST",
        body: payload,
      });

      if (!data?.token) {
        throw new Error("Server response invalid.");
      }

      login(data.token, data.user);
      nav(role === "tutor" ? "/tutor-profile-setup" : "/welcome-setup");

    } catch (error) {
      setErr("Connection Error: The server is not responding. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-xl px-6 py-20">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Join Lernitt</h1>
          <p className="text-slate-500 mt-2 font-medium">Create your academy account.</p>
        </div>

        <section className="rounded-[32px] bg-white p-8 shadow-xl border border-slate-100">
          
          <div className="mb-8">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4 text-center">I am registering as a:</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-4 rounded-2xl font-bold border-2 transition-all ${role === 'student' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole("tutor")}
                className={`py-4 rounded-2xl font-bold border-2 transition-all ${role === 'tutor' ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
              >
                👨‍🏫 Tutor
              </button>
            </div>
          </div>

          {err && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:bg-white outline-none"
            />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:bg-white outline-none"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:bg-white outline-none"
            />

            <label className="flex items-center gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-xs font-bold text-slate-500">I agree to the Terms & Privacy Policy</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-6 py-5 text-sm font-black uppercase tracking-widest text-white shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Finalise Registration"}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-50 pt-6">
            <p className="text-xs font-bold text-slate-400">
              Already have an account? <Link to="/login" className="text-indigo-600">Login here</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
