import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, BookOpen, ShieldCheck, ArrowRight } from "lucide-react";
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
      <header className="border-b border-slate-700/80 bg-topbar px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9.5 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-secondary text-white font-heading font-extrabold text-[15px] shadow-sm ring-2 ring-teal-500/30">
              EV
            </div>
            <div>
              <p
                style={{ color: "#ffffff" }}
                className="font-heading text-[19px] font-extrabold tracking-tight !text-white leading-tight drop-shadow-xs"
              >
                {t("app.name")}
              </p>
              <p
                style={{ color: "#f1f5f9" }}
                className="text-xs font-semibold !text-slate-100 mt-0.5"
              >
                Senior Review Gateway · Riverside High
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full shadow-xs">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Production Deployment Ready</span>
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-12 flex items-center justify-center">
        <div className="mx-auto max-w-5xl w-full space-y-10">
          <div className="text-center space-y-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              EdVidura Management Review Portal
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-700 max-w-2xl mx-auto leading-relaxed">
              Welcome, senior leadership. Choose an authorized persona below to launch an authentic,
              database-backed LTI 1.3 session into Riverside High School Class 8 Algebra I (
              <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-xs font-mono font-bold text-slate-800">
                RHS-C08
              </code>
              ).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* 1. Learner */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-surface p-6 shadow-xs hover:border-secondary hover:shadow-md transition-all">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <GraduationCap size={26} aria-hidden />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Persona 1 · Student Learner
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5 font-heading">
                    Alice Nguyen
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">Subject ID: 6 · Class 8</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Class 8 Algebra lessons, interactive practice quizzes, Living Interactive
                  Textbooks with multi-lingual audio narration, concept reels, 3D Spatial Labs, and
                  Ask Vidura Guided Mastery Tutor.
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
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-surface p-6 shadow-xs hover:border-teal-600 hover:shadow-md transition-all">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <BookOpen size={26} aria-hidden />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Persona 2 · Faculty Instructor
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5 font-heading">
                    Priya Sharma
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">Teacher ID: TCH-08 · Algebra</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Class quiz results, Unified Rubric Grader, Content Studio (create & publish
                  lessons, attach video checkpoints), cohort analytics, 3D lab telemetry, and live
                  activity monitor.
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
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-surface p-6 shadow-xs hover:border-amber-600 hover:shadow-md transition-all">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <ShieldCheck size={26} aria-hidden />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Persona 3 · Administrator
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5 font-heading">
                    Alex Morgan
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Admin Code: ADM-01 · Riverside High
                  </p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Institutional command center, compliance alerts, student directory with roster
                  synchronization, multi-campus management, school profile settings, and operational
                  audit trails.
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
        </div>
      </main>

      <footer className="border-t border-border bg-surface px-6 py-4 text-center text-xs text-ink-muted">
        EdVidura &copy; 2026 · Integrated Learning Tool for Moodle LMS · Single Unified Deployment
      </footer>
    </div>
  );
}
