// client/src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

/**
 * PAGE: ForgotPassword
 * Entry point for the secure recovery flow.
 * Allows users to request a password reset link via SendGrid.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Calls the new backend endpoint we added to auth.js
      const data = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setMessage(data.message || "Reset link sent! Please check your inbox.");
    } catch (err) {
      console.error("[FORGOT_PWD] Error:", err);
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4 font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl shadow-indigo-100 border border-slate-100">
        
        {/* Branding & Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-slate-900 tracking-tighter mb-2">
            LERNITT
          </div>
          <h1 className="text-xl font-bold text-slate-800">Forgot Password?</h1>
          <p className="text-sm text-slate-500 mt-2">
            Enter your email and we'll send you a secure link to reset your credentials.
          </p>
        </div>

        {/* Feedback Alerts */}
        {message && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-2xl font-medium animate-in fade-in slide-in-from-top-2">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-medium animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Request Form */}
        {!message && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Registered Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-lg ${
                loading 
                  ? "bg-slate-300 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 active:scale-[0.98]"
              }`}
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <Link 
            to="/login" 
            className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
