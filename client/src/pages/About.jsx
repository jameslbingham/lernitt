// client/src/pages/About.jsx

export default function About() {
  return (
    <div className="px-4 py-10 max-w-4xl mx-auto">
      {/* ================================
          HERO SECTION
      ================================= */}
      <section className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">About Lernitt</h1>
        <p className="text-slate-600 text-lg">
          A global learning platform built for fairness, transparency, and high-quality teaching.
        </p>
      </section>

      {/* ================================
          WHO WE ARE
      ================================= */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-10 border border-slate-200">
        <h2 className="text-2xl font-semibold mb-3">Who We Are</h2>
        <p className="text-slate-700 mb-4">
          Lernitt is an Australian-based global marketplace for live online lessons. 
          We connect students with qualified tutors for personalised, effective, 
          one-on-one learning.
        </p>

        <p className="text-slate-700 mb-4">
          We built Lernitt with a simple belief: education works best when the platform 
          treats both students and tutors fairly. Unlike many tutoring marketplaces, 
          Lernitt avoids aggressive commissions, confusing pricing structures, or 
          hidden fees.
        </p>

        <p className="text-slate-700">
          Our mission is to create a safe, transparent and uplifting environment that 
          allows students to grow and tutors to thrive.
        </p>
      </section>

      {/* ================================
          OUR MISSION
      ================================= */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-10 border border-slate-200">
        <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>

        <ul className="list-disc pl-5 space-y-2 text-slate-700">
          <li>Make high-quality one-on-one learning accessible worldwide</li>
          <li>Provide students with safe, flexible and affordable learning choices</li>
          <li>Empower tutors with fair pay and modern teaching tools</li>
          <li>Remove unnecessary friction between learning and teaching</li>
          <li>Build long-term, trust-based relationships between students and tutors</li>
        </ul>
      </section>

      {/* ================================
          WHAT MAKES US DIFFERENT
      ================================= */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-10 border border-slate-200">
        <h2 className="text-2xl font-semibold mb-4">What Makes Lernitt Different?</h2>

        <div className="space-y-6">

          <div>
            <h3 className="text-xl font-semibold text-blue-700 mb-2">
              🌍 Students: Choice, Fairness & Flexibility
            </h3>
            <p className="text-slate-700">
              Students choose tutors across a wide range of price points — from beginners 
              to highly experienced professionals. No subscriptions, no lock-ins, and three 
              free trial lessons to help you find the perfect tutor.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-green-700 mb-2">
              💰 Tutors: Keep 85% of What You Earn
            </h3>
            <p className="text-slate-700">
              With only a 15% commission, tutors earn more on Lernitt than on most global 
              tutoring platforms. You control your rates, your schedule and your growth.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-purple-700 mb-2">
              🔒 Safety First
            </h3>
            <p className="text-slate-700">
              Age requirements, lesson recording options, dispute support, compliance with 
              Australian and international privacy standards — all designed to protect both 
              students and tutors.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-orange-700 mb-2">
              🚀 Modern Lesson Tools
            </h3>
            <p className="text-slate-700">
              High-quality video calls, scheduling, messaging, reminders, secure payments, 
              analytics and more — all built into one seamless platform.
            </p>
          </div>
        </div>
      </section>

      {/* ================================
          OUR VALUES
      ================================= */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-12 border border-slate-200">
        <h2 className="text-2xl font-semibold mb-4">Our Values</h2>

        <ul className="list-disc pl-5 space-y-2 text-slate-700">
          <li><strong>Fairness</strong> — tutors earn more, students pay fairly.</li>
          <li><strong>Transparency</strong> — no hidden fees or confusing pricing.</li>
          <li><strong>Safety</strong> — strong protection policies and reporting tools.</li>
          <li><strong>Quality</strong> — focusing on meaningful educational progress.</li>
          <li><strong>Respect</strong> — everyone is treated with professionalism and dignity.</li>
        </ul>
      </section>

      {/* ================================
          CALL TO ACTION
      ================================= */}
      <section className="text-center">
        <p className="text-slate-600 mb-5 text-lg">
          Whether you want to learn or teach, Lernitt gives you the tools to succeed.
        </p>

        <div className="flex justify-center gap-4">
          <a
            href="/tutors"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Tutors
          </a>

          <a
            href="/signup?role=tutor"
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Become a Tutor
          </a>
        </div>
      </section>
    </div>
  );
}
