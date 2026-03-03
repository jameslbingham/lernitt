// client/src/pages/About.jsx
import { Link } from "react-router-dom";

/**
 * LERNITT ACADEMY - ABOUT PAGE v4.2.0
 * ----------------------------------------------------------------------------
 * VITAL RULE: This file contains the primary brand narrative and founder stats.
 * DO NOT truncate descriptive sections or statistical credibility blocks.
 * ----------------------------------------------------------------------------
 */

export default function About() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50 font-sans">
      <main className="mx-auto max-w-6xl px-6 pt-20 pb-24 space-y-16">

        {/* HERO SECTION (Preserved & Enhanced Typography) */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-black sm:text-6xl tracking-tighter text-slate-900 dark:text-white">
            About Lernitt
          </h1>
          <p className="mx-auto max-w-2xl text-base opacity-70 sm:text-lg leading-relaxed font-medium">
            A global learning platform built by a real tutor — designed with the heart,
            insight and experience of someone who understands both sides of the lesson.
          </p>
        </section>

        {/* OUR STORY (Restored Full Original Content) */}
        <section
          className="rounded-[40px] border border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-12 shadow-sm space-y-6"
        >
          <h2 className="text-3xl font-bold tracking-tight">Our Story</h2>
          <div className="space-y-4 text-base opacity-85 leading-relaxed font-medium">
            <p>
              Lernitt was created from a simple belief: learning works best when real people
              connect — with clarity, fairness and genuine understanding. After more than
              a decade teaching online and supporting students from all over the world, our
              founder saw what worked, what didn’t, and what students and tutors wished existed.
            </p>
            <p>
              Having lived as an expat for over 10 years in Asia and Europe, working and
              teaching across cultures, he gained a deep understanding of what learners
              truly need — and what kind of platform actually supports tutors. Lernitt was
              built to be friendly, simple, and human-centred, not corporate or complicated.
            </p>
          </div>
        </section>

        {/* FOUNDER SECTION (Restored Full Original Content + STAT BLOCK) */}
        <section
          className="rounded-[40px] p-12 shadow-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white space-y-8"
        >
          <h2 className="text-3xl font-black tracking-tight">Built by a Tutor Who Understands Both Sides</h2>

          {/* SOPHISTICATED IMPROVEMENT: RESTORED FOUNDER CREDIBILITY STAT BLOCK */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/10 border border-white/20 p-6 text-center backdrop-blur-sm transition-transform hover:scale-105">
              <div className="text-4xl font-black mb-1">10+ years</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-90">Online tutoring experience</div>
            </div>
            <div className="rounded-3xl bg-white/10 border border-white/20 p-6 text-center backdrop-blur-sm transition-transform hover:scale-105">
              <div className="text-4xl font-black mb-1">Thousands</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-90">Lessons taught</div>
            </div>
            <div className="rounded-3xl bg-white/10 border border-white/20 p-6 text-center backdrop-blur-sm transition-transform hover:scale-105">
              <div className="text-4xl font-black mb-1">CEFR Focus</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-90">Exams, jobs, confidence</div>
            </div>
          </div>

          <div className="space-y-6 text-base leading-relaxed opacity-95 font-medium">
            <p>
              Lernitt is not a Silicon Valley tech product — it is a platform shaped by real
              teaching experience. With over <strong className="font-bold">10 years of
              online tutoring</strong> and thousands of lessons taught, our founder has helped
              students achieve remarkable results: job interviews, language exams, career
              transitions and life-changing confidence.
            </p>
            <p>
              Because he has also spent years studying languages online himself, Lernitt was
              built with empathy for both perspectives. We know what motivates students. We
              know what makes a truly great tutor. And we know how important it is for a
              learning platform to feel simple, welcoming and trustworthy.
            </p>
            <p>
              This blend of teaching expertise, learner insight, and global experience informs
              every part of Lernitt — from the design choices to the lesson tools to the fair,
              transparent pricing structure.
            </p>
          </div>
        </section>

        {/* WHAT MAKES US DIFFERENT (Restored Full Original Content) */}
        <section
          className="rounded-[40px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 shadow-sm space-y-8"
        >
          <h2 className="text-3xl font-bold tracking-tight">What Makes Lernitt Different?</h2>

          <div className="grid gap-8 sm:grid-cols-2">
            {/* For Students */}
            <div className="space-y-4 rounded-3xl border border-gray-50 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">For Students</h3>
              <p className="text-sm opacity-85 leading-relaxed font-medium">
                Lernitt offers tutors at every price point, from affordable beginners to
                highly experienced specialists. With{" "}
                <strong className="font-bold">three free trial lessons</strong>, you can
                explore different tutors, teaching styles and subjects before choosing the
                right match.
              </p>
              <p className="text-sm opacity-85 leading-relaxed font-medium">
                You stay in control — choosing the tutor who fits your learning goals,
                personality and budget.
              </p>
            </div>

            {/* For Tutors */}
            <div className="space-y-4 rounded-3xl border border-gray-50 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">For Tutors</h3>
              <p className="text-sm opacity-85 leading-relaxed font-medium">
                Lernitt gives tutors a fairer platform — with a transparent{" "}
                <strong className="font-bold">15% commission</strong> so you keep more of
                what you earn.
              </p>
              <p className="text-sm opacity-85 leading-relaxed font-medium">
                Because Lernitt is built by a tutor, the tools are practical, the layout is
                clean, and the system supports your success rather than restricting it.
                Scheduling is simple, communication is clear, and payouts are fast.
              </p>
            </div>
          </div>
        </section>

        {/* OUR MISSION & FAIRNESS (Surgical Synchronization) */}
        <section
          className="rounded-[40px] border border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-12 shadow-sm space-y-6"
        >
          <h2 className="text-3xl font-bold tracking-tight">Our Mission & Fairness</h2>
          <div className="space-y-4 text-base opacity-85 leading-relaxed font-medium">
            <p>
              Lernitt exists to make high-quality learning accessible and to give tutors the
              fairness and support they deserve. Great learning happens when tutors feel valued
              and students feel confident — and our platform is built to make that possible.
            </p>
            <p>
              Every decision we make, from our <strong className="text-indigo-600 dark:text-indigo-400">15% commission</strong> 
              to our strict <Link to="/legal/privacy" className="underline font-black text-indigo-600">Privacy Protocols</Link>, 
              is designed to protect the professional integrity of our tutors and the 
              learning outcomes of our students.
            </p>
          </div>
        </section>

        {/* CTA (Final Brand Polish) */}
        <section className="text-center space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-3xl font-black tracking-tighter">Ready to get started?</h2>
          <div className="flex justify-center gap-4">
            <Link
              to="/tutors"
              className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-1 hover:bg-indigo-700"
            >
              Browse Tutors
            </Link>
            <Link
              to="/signup?type=tutor"
              className="rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-md transition hover:-translate-y-1 hover:bg-slate-50"
            >
              Apply to Teach
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
