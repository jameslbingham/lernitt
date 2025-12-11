// client/src/pages/About.jsx
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-20 space-y-16">

        {/* HERO SECTION */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold sm:text-5xl">
            About Lernitt
          </h1>
          <p className="mx-auto max-w-2xl text-sm opacity-80 sm:text-base">
            A global learning platform built by a real tutor — for students and tutors everywhere.
          </p>
        </section>

        {/* OUR STORY */}
        <section
          className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4"
        >
          <h2 className="text-2xl font-bold">Our Story</h2>
          <p className="text-sm opacity-85 leading-relaxed">
            Lernitt was founded with a simple idea: learning works best when students connect with
            tutors who truly understand their goals. Many platforms feel complicated, expensive,
            or impersonal — we wanted to fix that.
          </p>
          <p className="text-sm opacity-85 leading-relaxed">
            Our mission is to create a platform that is friendly, simple, affordable, and genuinely
            helpful for both sides of the learning experience.
          </p>
        </section>

        {/* FOUNDER SECTION */}
        <section
          className="rounded-2xl p-8 shadow-sm bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white space-y-4"
        >
          <h2 className="text-2xl font-bold">Built by a Tutor Who Understands Both Sides</h2>
          <p className="text-sm leading-relaxed opacity-90">
            Lernitt is not a corporate project. It was created by a tutor with over{" "}
            <strong className="font-semibold">10 years of real online teaching experience</strong>,
            thousands of lessons taught, and a deep understanding of what students actually need to succeed.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            Our founder has helped students achieve outstanding results — from job interview success to 
            language exam passes and real-world confidence. That insight shapes every feature on Lernitt.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            Because he has also been a student learning languages online, Lernitt is built with empathy 
            for both perspectives. We know what motivates students. We know what makes a great tutor. 
            And we know what gets in the way — so we designed a platform that removes everything unnecessary.
          </p>
        </section>

        {/* WHAT MAKES US DIFFERENT */}
        <section
          className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6"
        >
          <h2 className="text-2xl font-bold">What Makes Lernitt Different?</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Students */}
            <div className="space-y-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">For Students</h3>
              <p className="text-sm opacity-85 leading-relaxed">
                Lernitt offers tutors at every price point, from budget-friendly options to highly
                experienced specialists. With{" "}
                <strong className="font-semibold">three free trial lessons</strong>, students can explore 
                different tutors, styles, and subjects before committing.
              </p>
              <p className="text-sm opacity-85 leading-relaxed">
                You choose the tutor that matches your goals — guided by real experience and transparent pricing.
              </p>
            </div>

            {/* Tutors */}
            <div className="space-y-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">For Tutors</h3>
              <p className="text-sm opacity-85 leading-relaxed">
                Lernitt gives tutors more freedom, more support, and{" "}
                <strong className="font-semibold">significantly lower commission fees</strong> than other platforms.
              </p>
              <p className="text-sm opacity-85 leading-relaxed">
                With a transparent{" "}
                <strong className="font-semibold">15% commission</strong>, tutors keep far more of
                what they earn — while still accessing a growing global audience.
              </p>
              <p className="text-sm opacity-85 leading-relaxed">
                We built the tools tutors actually need: simple scheduling, clear payouts, fair pricing,
                and a platform designed by someone who knows the job.
              </p>
            </div>
          </div>
        </section>

        {/* OUR MISSION */}
        <section
          className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4"
        >
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p className="text-sm opacity-85 leading-relaxed">
            Lernitt exists to make high-quality learning accessible — and to empower tutors with
            the tools and fairness they deserve. When both sides thrive, learning becomes smoother,
            faster, and more enjoyable.
          </p>
          <p className="text-sm opacity-85 leading-relaxed">
            We believe learning should feel personal. Human. Motivating. And supported by a platform
            that truly understands what happens in real lessons — because we’ve been there.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <div className="flex justify-center gap-4">
            <Link
              to="/tutors"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg"
            >
              Browse Tutors
            </Link>
            <Link
              to="/signup?type=tutor"
              className="rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Become a Tutor
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
