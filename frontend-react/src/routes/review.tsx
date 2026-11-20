import { createFileRoute } from "@tanstack/react-router";
import {
  GraduationCap,
  BookOpen,
  Users,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { DynamicBlockCatalog } from "@/components/shared/DynamicBlockCatalog";
import { t } from "@/i18n";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "EdVidura — Senior Review Gateway" },
      {
        name: "description",
        content:
          "Direct access gateway for senior management review of EdVidura LTI 1.3 learning tool.",
      },
    ],
  }),
  component: ReviewGateway,
});

function ReviewGateway() {
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-content items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              EV
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-ink">{t("app.name")}</p>
              <p className="text-xs font-medium text-ink-muted">
                Senior Review Gateway · Riverside High
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
            <span>Production Deployment Ready</span>
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="text-center space-y-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              EdVidura Management Review Portal
            </h1>
            <p className="text-base font-medium text-slate-800 max-w-2xl mx-auto leading-relaxed">
              Welcome, senior leadership. Choose an authorized persona below to launch an authentic,
              database-backed LTI 1.3 session into Riverside High School Class 8 Algebra I (
              <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-xs font-mono font-bold text-slate-800">
                RHS-C08
              </code>
              ).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Learner */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-surface p-6 shadow-xs hover:border-secondary/50 hover:shadow-md transition-all">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <GraduationCap size={26} aria-hidden />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Persona 1 · Student Learner
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Alice Nguyen</h2>
                  <p className="text-xs text-slate-500 font-mono">Subject ID: 6 · Class 8</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Class 8 Algebra lessons, interactive Slice A quiz, Living Interactive Textbooks
                  with multi-lingual audiobooks, concept reels, and Ask Vidura Guided Mastery Tutor.
                </p>
              </div>
              <a
                href="/api/v1/auth/demo-launch?persona=learner"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-secondary/90 transition-colors"
              >
                <span>Launch as Learner</span>
                <ArrowRight size={14} aria-hidden />
              </a>
            </div>

            {/* 2. Instructor */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-surface p-6 shadow-xs hover:border-teal-600/50 hover:shadow-md transition-all">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <BookOpen size={26} aria-hidden />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Persona 2 · Faculty Instructor
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Priya Sharma</h2>
                  <p className="text-xs text-slate-500 font-mono">Teacher ID: TCH-08 · Algebra</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Live class results, verified grade receipts, Curriculum Coverage Map, Content
                  Studio (author interactive chapters & lessons), class analytics, and activity
                  audit streams.
                </p>
              </div>
              <a
                href="/api/v1/auth/demo-launch?persona=instructor"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-colors"
              >
                <span>Launch as Instructor</span>
                <ArrowRight size={14} aria-hidden />
              </a>
            </div>

            {/* 3. School Admin */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-surface p-6 shadow-xs hover:border-amber-600/50 hover:shadow-md transition-all">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <ShieldCheck size={26} aria-hidden />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Persona 3 · Administrator
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Alex Morgan</h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Admin Code: ADM-01 · Subject: 5
                  </p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  School institutional overview, faculty directory, student roster synchronization,
                  class sections management, school profile, and LTI 1.3 deployment bindings.
                </p>
              </div>
              <a
                href="/api/v1/auth/demo-launch?persona=admin"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
              >
                <span>Launch as School Admin</span>
                <ArrowRight size={14} aria-hidden />
              </a>
            </div>
          </div>

          {/* Direct 1-Click Launchers for New & Enhanced EdVidura Screens */}
          <div className="rounded-2xl border border-secondary/30 bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Featured Portals · Adapted & Enhanced
                </span>
                <h3 className="text-base font-bold text-ink mt-0.5">
                  1-Click Direct Localhost Links (Authenticated Launches)
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                Session Auto-Established
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Screen 1 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/home"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 1 · Dashboard
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-secondary">
                    Learner Course Dashboard
                  </h4>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-snug">
                    Inspirational hero, study rhythm bar chart, syllabus ring, and 2-min daily
                    review.
                  </p>
                </div>
                <div className="pt-3 text-xs font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /home</span>
                  <ArrowRight size={12} />
                </div>
              </a>

              {/* Screen 2 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/lessons"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 2 · Video Masterclass
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-secondary">
                    Lessons & Video Masterclasses
                  </h4>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-snug">
                    Modular lessons list with embedded video masterclass, chapter jumping, and
                    notes.
                  </p>
                </div>
                <div className="pt-3 text-xs font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /lessons</span>
                  <ArrowRight size={12} />
                </div>
              </a>

              {/* Screen 3 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/xr-store"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 3 · 3D Spatial
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary">
                    3D Spatial Math Labs
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    Interactive Cartesian coordinate simulator (slope & intercept sliders, dynamic y
                    = mx + b).
                  </p>
                </div>
                <div className="pt-3 text-xs sm:text-sm font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /xr-store</span>
                  <ArrowRight size={14} />
                </div>
              </a>

              {/* Screen 4 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/learn/coach"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 4 · Guided Tutor
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary">
                    Ask Vidura Tutor
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    Skill ladder, guided inquiry, voice dictation, and diagnostic checks.
                  </p>
                </div>
                <div className="pt-3 text-xs sm:text-sm font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /learn/coach</span>
                  <ArrowRight size={14} />
                </div>
              </a>

              {/* Screen 5 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/manuals"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 5 · Living Textbooks
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary">
                    Interactive Textbooks & Audiobooks
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    5 full demo textbooks, multi-lingual TTS audiobooks, and animated concept
                    stages.
                  </p>
                </div>
                <div className="pt-3 text-xs sm:text-sm font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /manuals</span>
                  <ArrowRight size={14} />
                </div>
              </a>

              {/* Screen 6 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/learn/gap"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 6 · Study Path
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary">
                    Your Path to Mastery
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    Connected curriculum roadmap linking textbook chapters, reels, and quizzes.
                  </p>
                </div>
                <div className="pt-3 text-xs sm:text-sm font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /learn/gap</span>
                  <ArrowRight size={14} />
                </div>
              </a>

              {/* Screen 7 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/learn/micro"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 7 · Concept Reels
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary">
                    Micro-Learning Concept Reels
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    9:16 vertical concept card player with crisp diagram schematics and quick
                    checks.
                  </p>
                </div>
                <div className="pt-3 text-xs sm:text-sm font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /learn/micro</span>
                  <ArrowRight size={14} />
                </div>
              </a>

              {/* Screen 8 */}
              <a
                href="/api/v1/auth/demo-launch?persona=learner&next=/learn/analytics"
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-surface hover:border-secondary transition shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-secondary uppercase">
                    Screen 8 · Skill Passport
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary">
                    Skill Passport & Analytics
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    Certified competency credentials, focus hours, and non-overlapping donut gauges.
                  </p>
                </div>
                <div className="pt-3 text-xs sm:text-sm font-bold text-secondary inline-flex items-center gap-1">
                  <span>Open /learn/analytics</span>
                  <ArrowRight size={14} />
                </div>
              </a>
            </div>
          </div>

          <div className="rounded-control border border-border bg-surface p-6 space-y-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Users size={16} className="text-secondary" />
              <span>Full IMS Global LTI 1.3 Moodle Integration</span>
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              In production cloud deployment, the 1-click persona launches above immediately
              establish authentic database-backed sessions with signed tokens. When developing
              locally with Docker Moodle (<code className="font-mono">localhost:8085</code>),
              launches arrive via standard LTI 1.3 OIDC login at{" "}
              <code className="font-mono">/lti/launch</code>.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="http://localhost:8085/course/view.php?id=10"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-control border border-border bg-page-bg px-3.5 py-2 text-xs font-semibold text-ink hover:bg-muted transition-colors"
              >
                <span>Local Docker Moodle (localhost:8085)</span>
                <ExternalLink size={13} aria-hidden />
              </a>
              <span className="text-xs text-ink-muted">
                (Local Moodle test accounts: <code className="font-mono">riverside_alice</code>,{" "}
                <code className="font-mono">riverside_priya</code>, or{" "}
                <code className="font-mono">riverside_admin</code>)
              </span>
            </div>
          </div>

          <DynamicBlockCatalog role="all" />
        </div>
      </main>

      <footer className="border-t border-border bg-surface px-6 py-4 text-center text-xs text-ink-muted">
        EdVidura &copy; 2026 · Integrated Learning Tool for Moodle LMS · Single Unified Deployment
      </footer>
    </div>
  );
}
