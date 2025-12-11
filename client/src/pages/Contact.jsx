// client/src/pages/Contact.jsx
import { Link } from "react-router-dom";

export default function Contact() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-20 space-y-16">

        {/* HERO */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Contact Lernitt</h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base opacity-80">
            We’re here to help. Whether you’re a student, tutor, or visitor, our support team will assist you as quickly as possible.
          </p>
        </section>

        {/* SUPPORT SECTIONS */}
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
              Email: <a className="text-blue-600 font-semibold" href="mailto:support@lernitt.com">support@lernitt.com</a>
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
              Email: <a className="text-blue-600 font-semibold" href="mailto:billing@lernitt.com">billing@lernitt.com</a>
            </p>
          </div>

          {/* SAFETY & COMPLAINTS */}
          <div className="rounded-2xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">Safety, Conduct or Complaints</h2>
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
              Email: <a className="text-blue-600 font-semibold" href="mailto:legal@lernitt.com">legal@lernitt.com</a>
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 opacity-90">
              If anyone is at immediate risk, contact your local emergency services before contacting Lernitt.
            </p>
          </div>

        </section>

        {/* RESPONSE TIME */}
        <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold">How Quickly We Respond</h2>
          <p className="text-sm opacity-85 leading-relaxed">
            Our team aims to reply within <strong>24–48 hours</strong>.  
            Complaints or urgent matters may be prioritised.
          </p>
        </section>

        {/* LINKS TO POLICIES */}
        <section className="text-center space-y-4">
          <h2 className="text-lg font-semibold">Helpful Links</h2>
          <div className="flex justify-center flex-wrap gap-4 text-sm">
            <Link className="underline hover:text-blue-600" to="/privacy">Privacy Policy</Link>
            <Link className="underline hover:text-blue-600" to="/cookies">Cookie Policy</Link>
            <Link className="underline hover:text-blue-600" to="/complaints">Complaints Policy</Link>
            <Link className="underline hover:text-blue-600" to="/age-requirements">Age Requirements</Link>
            <Link className="underline hover:text-blue-600" to="/terms">Terms & Conditions</Link>
          </div>
        </section>

      </main>
    </div>
  );
}
