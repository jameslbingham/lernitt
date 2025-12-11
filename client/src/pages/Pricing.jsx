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
          Lernitt gives students flexibility and gives tutors the best earnings in the industry.
        </p>
      </section>

      {/* ================================
          STUDENT PRICING
      ================================= */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-12 border border-slate-200">
        <h2 className="text-2xl font-semibold mb-4">Pricing for Students</h2>

        <p className="mb-4 text-slate-700">
          Lernitt is designed to give every student access to the right tutor—no matter your budget.
          Each tutor sets their own hourly rate based on their skills, demand, and experience. This
          gives you a wide range of price options, from affordable beginners to highly experienced
          experts.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-700 mb-2">🎁 You get 3 FREE trial lessons</h3>
          <p className="text-blue-800">
            Try any tutor before committing. You can take up to <strong>three free 30-minute trials</strong> with different tutors.
          </p>
        </div>

        <ul className="list-disc pl-5 space-y-2 text-slate-700 mb-6">
          <li>Choose from tutors at all price levels</li>
          <li>No subscriptions or lock-in contracts</li>
          <li>Pay only for the lessons you book</li>
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
          Lernitt is built to empower tutors. Unlike other platforms that take 20–33% of your income,
          Lernitt keeps commission low and transparent—so you earn more from every lesson.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-700 mb-2">💰 Only 15% tutor commission</h3>
          <p className="text-green-800">
            You keep <strong>85% of every lesson</strong>. Our competitors usually take far more.
          </p>
        </div>

        <ul className="list-disc pl-5 space-y-2 text-slate-700 mb-6">
          <li>Set your own hourly rate</li>
          <li>No joining fees & no monthly fees</li>
          <li>Automatic payouts to your bank or PayPal</li>
          <li>Fast scheduling, booking and lesson tools</li>
          <li>More earnings on every lesson you teach</li>
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
