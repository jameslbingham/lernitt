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
            A global learning platform built by a real tutor — designed with the heart,
            insight and experience of someone who understands both sides of the lesson.
          </p>
        </section>

        {/* OUR STORY */}
        <section
          className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4"
        >
          <h2 className="text-2xl font-bold">Our Story</h2>
          <p className="text-sm opacity-85 leading-relaxed">
            Lernitt was created from a simple belief: learning works best when real people
            connect — with clarity, fairness and genuine understanding. After more than
            a decade teaching online and supporting students from all over the world, our
            founder saw what worked, what didn’t, and what students and tutors wished existed.
          </p>
          <p className="text-sm opacity-85 leading-relaxed">
            Having lived as an expat for over 10 years in Asia and Europe, working and
            teaching across cultures, he gained a deep understanding of what learners
            truly need — and what kind of platform actually supports tutors. Lernitt was
            built to be friendly, simple, and human-centred, not corporate or complicated.
          </p>
        </section>

        {/* FOUNDER SECTION */}
        <section
          className="rounded-2xl p-8 shadow-sm bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white space-y-4"
        >
          <h2 className="text-2xl font-bold">Built by a Tutor Who Understands Both Sides</h2>

          {/* FOUNDER CREDIBILITY STAT BLOCK (NEW) */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 border border-white/20 p-4 text-center">
              <div className="text-2xl font-extrabold">10+ years</div>
              <div className="text-xs opacity-90">Online tutoring experience</div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/20 p-4 text-center">
              <div className="text-2xl font-extrabold">Thousands</div>
              <div className="text-xs opacity-90">Lessons taught</div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/20 p-4 text-center">
              <div className="text-2xl font-extrabold">Real outcomes</div>
              <div className="text-xs opacity-90">Exams, jobs, confidence</div>
            </div>
          </div>

          <p className="text-sm leading-relaxed opacity-90">
            Lernitt is not a Silicon Valley tech product — it is a platform shaped by real
            teaching experience. With over <strong className="font-semibold">10 years of
            online tutoring</strong> and thousands of lessons taught, our founder has helped
            students achieve remarkable results: job interviews, language exams, career
            transitions and life-changing confidence.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            Because he has also spent years studying languages online himself, Lernitt was
            built with empathy for both perspectives. We know what motivates students. We
            know what makes a truly great tutor. And we know how important it is for a
            learning platform to feel simple, welcoming and trustworthy.
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            This blend of teaching expertise, learner insight, and global experience informs
            every part of Lernitt — from the design choices to the lesson tools to the fair,
            transparent pricing structure.
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
                Lernitt offers tutors at every price point, from affordable beginners to
                highly experienced specialists. With{" "}
                <strong className="font-semibold">three free trial lessons</strong>, you can
                explore different tutors, teaching styles and subjects before choosing the
                right match.
              </p>
              <p className="text-sm opacity-85 leading-relaxed">
                You stay in control — choosing the tutor who fits your learning goals,
                personality and budget.
              </p>
            </div>

            {/* Tutors */}
            <div className="space-y-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">For Tutors</h3>
              <p className="text-sm opacity-85 leading-relaxed">
                Lernitt gives tutors a fairer platform — with a transparent{" "}
                <strong className="font-semibold">15% commission</strong> so you keep more of
                what you earn.
              </p>
              <p className="text-sm opacity-85 leading-relaxed">
                Because Lernitt is built by a tutor, the tools are practical, the layout is
                clean, and the system supports your success rather than restricting it.
                Scheduling is simple, communication is clear, and payouts are fast.
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
            Lernitt exists to make high-quality learning accessible and to give tutors the
            fairness and support they deserve. Great learning happens when tutors feel valued
            and students feel confident — and our platform is built to make that possible.
          </p>
          <p className="text-sm opacity-85 leading-relaxed">
            We believe learning should feel personal, motivating and human. And we believe
            in a platform designed by someone who has lived the real tutoring experience —
            both as a teacher and as a student.
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
