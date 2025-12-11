// client/src/pages/Pricing.jsx

import { Link } from "react-router-dom";

export default function Pricing() {
  return (
    <div className="px-4 py-10 max-w-4xl mx-auto">
      {/* ================================
          HERO SECTION
      ================================= */}
      <section className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Simple, Fair & Transparent Pricing</h1>
        <p className="text-slate-600 text-lg">
          Lernitt is built for real learning — flexible pricing for students, and industry-leading earnings for tutors.
        </p>
      </section>

      {/* ================================
          STUDENT PRICING
      ================================= */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-12 border border-slate-200">
        <h2 className="text-2xl font-semibold mb-4">Pricing for Students</h2>

        <p className="mb-4 text-slate-700">
          Great tutors shouldn’t be limited to those with the highest budgets. On Lernitt,{" "}
          <strong>every tutor sets their own hourly rate</strong>, giving you a broad range of price points —
          from accessible beginners to highly specialised experts.
        </p>

        <p className="mb-4 text-slate-700">
          You stay in control: no subscriptions, no lock-ins, no long-term commitments. Pay only for
          the lessons you book, with complete transparency before checkout.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-700 mb-2">🎁 You get 3 FREE trial lessons</h3>
          <p className="text-blue-800">
            Try any tutor before committing. You can take up to <strong>three free 30-minute trials</strong> with different tutors — 
            a simple way to find the perfect match.
          </p>
        </div>

        <ul className="list-disc pl-5 space-y-2 text-slate-700 mb-6">
          <li>Tutors for every budget, subject and skill level</li>
          <li>No subscriptions or hidden fees</li>
          <li>Transparent lesson pricing — always shown upfront</li>
          <li>Secure payments through Stripe or PayPal</li>
        </ul>

        <div className="text-center">
          <Link
            to="/tutors"
            className="inline-block bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Tutors
          </Link>
        </div>
      </section>

      {/* ================================
          TUTOR PRICING / COMMISSION
      ================================= */}
      <section className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-2xl font-semibold mb-4">Pricing for Tutors</h2>

        <p className="mb-4 text-slate-700">
          Lernitt is designed by someone with over 10 years of online tutoring experience — a platform 
          that finally respects tutors and pays them what they deserve. Unlike many competitors that
          take 20–33% commission, Lernitt keeps things simple, fair and tutor-friendly.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-700 mb-2">💰 Only 15% tutor commission</h3>
          <p className="text-green-800">
            You keep <strong>85% of every lesson</strong>. Our low commission means more income, more freedom,
            and more long-term earning potential.
          </p>
        </div>

        <p className="mb-4 text-slate-700">
          Set your own rate, teach when you want, and grow your business with modern tools made specifically 
          for professional online tutors.
        </p>

        <ul className="list-disc pl-5 space-y-2 text-slate-700 mb-6">
          <li>Set your own hourly prices</li>
          <li>No joining fees, no monthly fees</li>
          <li>Automatic payouts to your bank or PayPal</li>
          <li>Scheduling, booking and messaging tools built for tutor success</li>
          <li>More earnings per lesson compared to major competitors</li>
        </ul>

        <div className="text-center">
          <Link
            to="/signup?role=tutor"
            className="inline-block bg-green-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Become a Tutor
          </Link>
        </div>
      </section>
    </div>
  );
}
