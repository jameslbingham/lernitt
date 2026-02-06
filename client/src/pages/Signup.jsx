import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { safeFetchJSON } from "../lib/safeFetch.js"; 
import { useAuth } from "../hooks/useAuth.jsx";

// FIX: Pointing to the live integrated service instead of the dead 'lernitt-server'
const API_URL = "https://lernitt.onrender.com";

export default function Signup() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student"); 
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [ackPrivacy, setAckPrivacy] = useState(false);
  const [ackAge, setAckAge] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = agreeTerms && ackPrivacy && ackAge;

  async function onSubmit(e) {
    e.preventDefault();
    if (loading || !canSubmit) return;

    setErr("");
    setLoading(true);

    try {
      // FIX: Communicating with the current live integrated URL
      const data = await safeFetchJSON(`${API_URL}/api/auth/signup`, {
        method: "POST",
        body: JSON.stringify({ email, password, name, role, type: role }),
      });

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.token) {
        throw new Error("The server did not return a security token.");
      }

      login(data.token, data.user);
      
      // Move to correct setup page based on role
      nav(role === "tutor" ? "/tutor-profile-setup" : "/welcome-setup");

    } catch (error) {
      // FIX: Providing a more accurate error message that doesn't reference the dead server
      setErr(error.message.includes("lernitt-server") 
        ? "System update in progress. Please refresh and try again." 
        : error.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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

            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                  I accept the Lernitt <Link to="/legal/terms" className="text-indigo-600 underline">Terms of Service</Link>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ackPrivacy}
                  onChange={(e) => setAckPrivacy(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                  I have read the academy <Link to="/legal/privacy" className="text-indigo-600 underline">Privacy Protocols</Link>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ackAge}
                  onChange={(e) => setAckAge(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                  I verify that I meet the <Link to="/legal/age-requirements" className="text-indigo-600 underline">Age Requirements</Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-2xl bg-slate-900 px-6 py-5 text-sm font-black uppercase tracking-widest text-white shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-30"
            >
              {loading ? "Connecting..." : "Finalise Registration"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
