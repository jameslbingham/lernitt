// client/src/pages/Contact.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { safeFetchJSON } from "../lib/safeFetch.js";

// FIX: Pointing to the live integrated service instead of local development pipes
const API_URL = "https://lernitt.onrender.com";

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "General", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  /**
   * SOPHISTICATED IMPROVEMENT: Context-Aware FAQ Bridge
   * This logic watches the user's category choice and offers immediate help.
   */
  const [faqHint, setFaqHint] = useState("");
  useEffect(() => {
    if (formData.subject === "Billing") setFaqHint("💡 Need a refund? Check our Payment Protocols below.");
    else if (formData.subject === "Tutor") setFaqHint("💡 Interested in teaching? Review our Tutor Guidelines first.");
    else if (formData.subject === "Legal") setFaqHint("💡 Safety is our priority. Urgent reports are monitored 24/7.");
    else setFaqHint("");
  }, [formData.subject]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      // SOPHISTICATED IMPROVEMENT: Direct Database Inquiry Pipeline
      // This sends the data to Bob's admin dashboard for tracking
      const res = await safeFetchJSON(`${API_URL}/api/support/inquiry`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (res.error) throw new Error(res.error);
      setSent(true);
    } catch (error) {
      setErr("Plumbing update in progress. Please use direct email support below.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-20 space-y-16">

        {/* HERO (Preserved 100%) */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Contact Lernitt</h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base opacity-80">
            We’re here to help. Lernitt is a founder-led platform built by an experienced
            online tutor who understands both students and tutors — and we take support seriously.
          </p>
        </section>

        {/* FOUNDER TRUST BLOCK (Preserved 100%) */}
        <section className="rounded-2xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-8 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            Real People. Real Experience.
          </h2>
          <p className="text-sm leading-relaxed opacity-90">
            Lernitt was founded by someone with over{" "}
            <strong>10 years of online tutoring experience</strong>, thousands of lessons taught,
            and firsthand experience learning languages online as a student.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            Having lived and worked as an expat across Asia and Europe, we understand what students
            and tutors actually need — clear communication, fair systems, and responsive support.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            You’re not contacting a faceless corporation — you’re contacting a platform built by a
            real tutor who still cares deeply about teaching quality and learner outcomes.
          </p>
        </section>

        {/* SOPHISTICATED UPGRADE: SMART INQUIRY FORM */}
        <section className="rounded-[32px] bg-slate-900 p-10 shadow-2xl text-white">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">New Official Inquiry</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium italic">Our automated tracking system ensures a recorded response.</p>
          </div>
          
          {sent ? (
            <div className="bg-emerald-500/10 border border-emerald-500/50 p-8 rounded-2xl text-emerald-400 font-bold">
              ✅ Message Synchronized. We have received your request and will review it within 24-48 hours.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all" 
                  placeholder="Full Name" 
                  required 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                  type="email" 
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all" 
                  placeholder="Email Address" 
                  required 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <select 
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-sm focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                >
                  <option value="General">General Support</option>
                  <option value="Billing">Billing & Payment Support</option>
                  <option value="Tutor">Teacher Application / Onboarding</option>
                  <option value="Legal">Safety, Privacy or Complaints</option>
                </select>
                {faqHint && <p className="text-xs text-indigo-400 font-bold ml-2 animate-pulse">{faqHint}</p>}
              </div>

              <textarea 
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-sm focus:border-indigo-500 outline-none min-h-[160px] transition-all" 
                placeholder="How can our founder-led team assist you today?" 
                required 
                onChange={e => setFormData({...formData, message: e.target.value})}
              />

              {err && <p className="text-red-400 text-xs font-bold text-center">{err}</p>}
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-2xl bg-indigo-600 px-6 py-5 text-sm font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50"
              >
                {loading ? "Connecting to server..." : "Send Official Inquiry"}
              </button>
            </form>
          )}
        </section>

        {/* SUPPORT SECTIONS (Preserved 100%) */}
        <section className="space-y-10">

          {/* GENERAL SUPPORT */}
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold">General Support</h2>
            <p className="text-sm opacity-85 leading-relaxed">
              For questions about your account, lessons, bookings, or using the platform:
            </p>
            <ul className="list-disc pl-5 text-sm opacity-85 space-y-1">
              <li>Help with finding a tutor</li>
              <li>Troubleshooting login or account issues</li>
              <li>Questions about features or settings</li>
            </ul>
            <p className="text-sm opacity-85">
              Email:{" "}
              <a className="text-blue-600 font-semibold" href="mailto:support@lernitt.com">support@lernitt.com</a>
            </p>
          </div>

          {/* BILLING SUPPORT */}
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold">Billing & Payment Support</h2>
            <p className="text-sm opacity-85 leading-relaxed">
              For payment questions, refunds, payout issues, or verification:
            </p>
            <ul className="list-disc pl-5 text-sm opacity-85 space-y-1">
              <li>Student payment problems</li>
              <li>Tutor payout questions</li>
              <li>Invoice or receipt requests</li>
            </ul>
            <p className="text-sm opacity-85">
              Email:{" "}
              <a className="text-blue-600 font-semibold" href="mailto:billing@lernitt.com">billing@lernitt.com</a>
            </p>
          </div>

          {/* SAFETY & COMPLAINTS */}
          <div className="rounded-2xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">
              Safety, Conduct or Complaints
            </h2>
            <p className="text-sm opacity-85 leading-relaxed">
              For conduct concerns, complaints, safety issues, or anything urgent involving minors:
            </p>
            <ul className="list-disc pl-5 text-sm opacity-85 space-y-1">
              <li>Inappropriate behaviour</li>
              <li>Safety concerns involving a student or tutor</li>
              <li>Breaches of community conduct</li>
              <li>Formal complaints (see Complaints Policy)</li>
            </ul>
            <p className="text-sm opacity-85">
              Email:{" "}
              <a className="text-blue-600 font-semibold" href="mailto:legal@lernitt.com">legal@lernitt.com</a>
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 opacity-90">
              If anyone is at immediate risk, contact your local emergency services before
              contacting Lernitt.
            </p>
          </div>
        </section>

        {/* RESPONSE TIME (Preserved 100%) */}
        <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold">How Quickly We Respond</h2>
          <p className="text-sm opacity-85 leading-relaxed">
            Our team aims to reply within <strong>24–48 hours</strong>.
            Complaints or urgent matters may be prioritised.
          </p>
        </section>

        {/* JURISDICTION (Preserved 100%) */}
        <section className="text-center text-xs opacity-70">
          Lernitt operates under the laws of <strong>Victoria, Australia</strong>.
        </section>

        {/* HELPFUL LINKS (Preserved & Synchronized 100%) */}
        <section className="text-center space-y-4">
          <h2 className="text-lg font-semibold">Helpful Links</h2>
          <div className="flex justify-center flex-wrap gap-4 text-sm">
            <Link className="underline hover:text-blue-600 font-bold" to="/legal/privacy">Privacy Protocols</Link>
            <Link className="underline hover:text-blue-600 font-bold" to="/legal/cookies">Cookie Policy</Link>
            <Link className="underline hover:text-blue-600 font-bold" to="/legal/complaints">Complaints Policy</Link>
            <Link className="underline hover:text-blue-600 font-bold" to="/legal/age-requirements">Age Requirements</Link>
            <Link className="underline hover:text-blue-600 font-bold" to="/legal/terms">Terms of Service</Link>
          </div>
        </section>

      </main>
    </div>
  );
}
