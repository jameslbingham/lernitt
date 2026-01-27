// client/src/pages/ResetPassword.jsx
import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

/**
 * PAGE: ResetPassword
 * Final step of the secure recovery flow.
 * Extracts token from URL and submits new credentials to the backend.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  // Local state for password entry
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (password !== confirmPassword) {
      return setError("Confirmation password does not match.");
    }

    setLoading(true);
    setError("");

    try {
      // Calls the /reset-password endpoint in auth.js
      const data = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });

      setMessage(data.message || "Success! Your credentials have been updated.");
      
      // Professional delay before redirecting to login
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      console.error("[RESET_PWD] Error:", err);
      setError(err.message || "The reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  // Guard clause: If no token is present in URL, show an error state
  if (!token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-sans">
        <div className="bg-red-50 border border-red-100 p-8 rounded-[40px] text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter">Access Denied</h2>
          <p className="text-sm text-red-600 mt-2 mb-6">This recovery link is malformed or missing a security token.</p>
          <Link to="/login" className="text-xs font-black uppercase tracking-widest text-slate-900 underline">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4 font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl shadow-indigo-100 border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-slate-900 tracking-tighter mb-2 uppercase">LERNITT</div>
          <h1 className="text-xl font-bold text-slate-800">Set New Password</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">Choose a strong new access code to regain entry to your academy dashboard.</p>
        </div>

        {message ? (
          <div className="p-6 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-3xl font-bold text-center animate-pulse">
            {message} <br />
            <span className="text-[10px] uppercase mt-2 block opacity-70 tracking-widest font-black">Redirecting to login portal...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-2xl font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl ${
                loading 
                  ? "bg-slate-300 cursor-not-allowed text-slate-500" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 active:scale-95 active:shadow-inner"
              }`}
            >
              {loading ? "Updating Credentials..." : "Finalise Password"}
            </button>
          </form>
        )}

        {/* Branding Footer */}
        <div className="mt-8 pt-8 border-t border-slate-50 text-center select-none opacity-20">
          <div className="text-xl font-black tracking-tighter text-slate-900">LERNITT</div>
          <div className="text-[8px] font-bold uppercase tracking-[0.4em] mt-1 text-slate-500">Secure Instance v4.1.2</div>
        </div>
      </div>
    </div>
  );
}
