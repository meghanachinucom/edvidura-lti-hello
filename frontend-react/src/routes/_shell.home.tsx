import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Layers,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Trophy,
  Video,
  Box,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { lessons } from "@/data/lessons";
import { getLessonImage } from "@/components/shared/LessonList";
import { checkpointQuiz } from "@/data/quiz";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/home")({
  head: () => ({
    meta: [
      { title: "Student Campus Hub" + t("app.titleSuffix") },
      { name: "description", content: "CampusHub student course home dashboard" },
    ],
  }),
  component: StudentHomePage,
});

export function StudentHomePage() {
  const navigate = useNavigate();
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [reviewsDue, setReviewsDue] = useState<
    Array<{ id: string; name: string; mastery_level: number }>
  >([]);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({
    correct: 4,
    total: 5,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("completed_lessons");
      if (stored) {
        setCompletedLessons(JSON.parse(stored));
      } else {
        setCompletedLessons(["lesson-1", "lesson-2"]);
      }
    } catch {
      setCompletedLessons(["lesson-1", "lesson-2"]);
    }

    api
      .get<{ ok: boolean; reviews: Array<{ id: string; name: string; mastery_level: number }> }>(
        "/api/v1/app/tutor/reviews-due",
      )
      .then((res) => {
        if (res && res.reviews) {
          setReviewsDue(res.reviews);
        }
      })
      .catch(() => {});
  }, []);

  const totalLessons = lessons.length;
  const doneCount = completedLessons.length;
  const percentComplete = Math.min(100, Math.round((doneCount / Math.max(totalLessons, 1)) * 100));

  const nextLesson = lessons.find((l) => !completedLessons.includes(l.id)) || lessons[0];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = now.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Weekly rhythm simulation data
  const rhythmDays = [
    { day: "Mon", hours: 4.2, hot: false },
    { day: "Tue", hours: 6.8, hot: true },
    { day: "Wed", hours: 5.1, hot: false },
    { day: "Thu", hours: 3.4, hot: false },
    { day: "Fri", hours: 7.5, hot: true },
    { day: "Sat", hours: 4.0, hot: false },
    { day: "Sun", hours: 2.1, hot: false },
  ];
  const maxHours = 8;

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      {/* Unified Standard Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          text="Student Campus Hub"
          context="Welcome back, Alice. Riverside High School · Class 8 Algebra I"
        />
        <div className="flex items-center gap-2">
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: nextLesson?.id || "lesson-1" }}
            className="btn-primary text-xs font-bold px-4 py-2 inline-flex items-center gap-1.5"
          >
            <PlayCircle size={15} />
            <span>Continue Lesson {nextLesson?.order || 1}</span>
          </Link>
          <Link
            to="/active-quizzes"
            className="btn-secondary text-xs font-bold px-4 py-2 inline-flex items-center gap-1.5"
          >
            <Trophy size={15} />
            <span>Active Quizzes</span>
          </Link>
        </div>
      </div>

      {/* 2-Minute Daily Review Strip */}
      {reviewsDue.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold text-ink">
                  2-Minute Daily Skill Review
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {reviewsDue.length} Skills Due
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Spaced refresher for {reviewsDue.map((r) => r.name).join(" · ")}. A quick 2-minute
                practice maintains your Level 5 mastery!
              </p>
            </div>
          </div>
          <Link
            to="/learn/coach"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition"
          >
            <span>Start 2-Min Review</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Course Continuity Overview Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            <Sparkles size={14} />
            <span>Slope-Intercept Equations · 3D Coordinates</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink">
            {greeting}, Alice. Ready to make today count?
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Slope-intercept equations, 3D Cartesian coordinates, interactive labs, and concept video
            masterclasses all in one unified learning hub.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: nextLesson?.id || "lesson-1" }}
            className="btn-primary text-xs font-bold px-4 py-2.5 inline-flex items-center gap-2"
          >
            <PlayCircle size={16} />
            <span>Resume Lesson</span>
          </Link>
          <Link
            to="/xr-store"
            className="btn-secondary text-xs font-bold px-4 py-2.5 inline-flex items-center gap-2"
          >
            <Box size={16} />
            <span>3D Labs</span>
          </Link>
        </div>
      </div>

      {/* 4 Balanced KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 tablet:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Lessons Done</span>
            <CheckCircle2 size={16} className="text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {doneCount} / {totalLessons}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">{percentComplete}% syllabus covered</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Quiz Score</span>
            <Trophy size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {Math.round((quizScore.correct / quizScore.total) * 100)}%
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            {quizScore.correct} of {quizScore.total} correct
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>eBooks Read</span>
            <BookOpen size={16} className="text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">1 / 5</div>
          <p className="mt-0.5 text-xs text-slate-600">Algebra I Handbook</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Active Streak</span>
            <Flame size={16} className="text-orange-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">5 Days</div>
          <p className="mt-0.5 text-xs text-slate-600">Top 10% in Class 8</p>
        </div>
      </div>

      {/* Primary 3-Column Highlights */}
      <div className="grid gap-6 tablet:grid-cols-3">
        {/* Course Syllabus Progress */}
        <div className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Course Completion
            </span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600">
              Unit 2
            </span>
          </div>
          <div className="my-6 flex items-center justify-center">
            <ProgressRing
              progress={percentComplete}
              size={120}
              strokeWidth={10}
              colorClass="text-amber-500"
              label={`${percentComplete}%`}
              subtext="Overall Syllabus"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-ink-muted border-t border-border pt-3">
            <span>
              {doneCount} of {totalLessons} Lessons Mastered
            </span>
            <Link
              to="/lessons"
              className="font-semibold text-amber-600 hover:underline inline-flex items-center gap-0.5"
            >
              All Lessons <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Up Next Learning Card */}
        <div className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Recommended Up Next
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
              Formative
            </span>
          </div>

          <div className="my-4 space-y-3">
            {/* Visual Thumbnail for Up Next Lesson */}
            <Link
              to="/lessons/$lessonId"
              params={{ lessonId: nextLesson?.id || "lesson-1" }}
              className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-slate-900 shadow-2xs group/thumb block"
              aria-label={`Open Lesson: ${nextLesson?.title || "Lesson"}`}
            >
              <img
                src={getLessonImage(nextLesson || { id: "1", order: 1 })}
                alt={nextLesson?.title || "Lesson Thumbnail"}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/images/lessons/lesson-default.svg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

              <span className="absolute bottom-2 left-2 rounded-md bg-slate-900/85 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-xs">
                {nextLesson?.kind || "lesson"}
              </span>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-slate-950/20">
                <div className="size-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg">
                  <PlayCircle size={22} />
                </div>
              </div>
            </Link>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Lesson {nextLesson?.order || 1}
              </div>
              <h3 className="font-heading text-lg font-bold text-ink leading-snug">
                {nextLesson?.title || "Cartesian Graphs and Intercepts"}
              </h3>
              <p className="text-xs text-ink-muted line-clamp-2">
                Explore how varying slope and intercept shifts the coordinate trajectory in 2D and 3D
                space.
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Clock size={14} /> 6 mins estimated · Interactive lab included
            </div>
            <Link
              to="/lessons/$lessonId"
              params={{ lessonId: nextLesson?.id || "lesson-1" }}
              className="btn-primary flex w-full items-center justify-center gap-2 text-xs font-bold"
            >
              <span>Start Lesson Now</span> <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Today's Schedule & Milestones */}
        <div className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Today's Schedule
            </span>
            <span className="text-xs font-semibold text-ink-muted">{dateLabel}</span>
          </div>
          <div className="my-4 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 p-3 border border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-ink">Cartesian Slope Lab</span>
              </div>
              <span className="text-xs font-mono text-amber-700 font-semibold">
                Active · 9:00 AM
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-page-bg p-3 border border-border">
              <div className="flex items-center gap-2.5">
                <MessageCircle size={14} className="text-sky-500" />
                <span className="text-xs font-semibold text-ink">Ask Vidura Tutoring</span>
              </div>
              <span className="text-xs font-mono text-ink-muted">12:00 PM</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-page-bg p-3 border border-border">
              <div className="flex items-center gap-2.5">
                <Trophy size={14} className="text-emerald-500" />
                <span className="text-xs font-semibold text-ink">Checkpoint 2 Quiz</span>
              </div>
              <span className="text-xs font-mono text-ink-muted">Due Friday</span>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <Link
              to="/active-quizzes"
              className="text-xs font-semibold text-amber-600 hover:underline flex items-center justify-between"
            >
              <span>View All 3 Active Quizzes</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Focus & Study Rhythm Charts */}
      <div className="rounded-3xl border border-border bg-surface p-6 tablet:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-ink">Weekly Study Rhythm</h2>
            <p className="text-xs text-ink-muted mt-1">
              Deep-work focus hours tracked via formative activities and interactive labs.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <span className="inline-block w-3 h-3 rounded bg-amber-500" /> Peak Day
            <span className="inline-block w-3 h-3 rounded bg-slate-200 ml-2" /> Standard Day
          </div>
        </div>

        {/* Bar Rhythm Graph */}
        <div className="grid grid-cols-7 gap-2 tablet:gap-4 items-end h-44 pt-6 pb-2 border-b border-border">
          {rhythmDays.map((d) => {
            const heightPct = Math.round((d.hours / maxHours) * 100);
            return (
              <div
                key={d.day}
                className="flex flex-col items-center gap-2 h-full justify-end group"
              >
                <span className="text-xs font-mono text-ink-muted opacity-0 group-hover:opacity-100 transition">
                  {d.hours}h
                </span>
                <div
                  className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 ${
                    d.hot
                      ? "bg-amber-500 shadow-md shadow-amber-500/20"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-xs font-semibold text-ink-muted">{d.day}</span>
              </div>
            );
          })}
        </div>

        {/* Quick Hub Navigation Cards */}
        <div className="grid gap-4 tablet:grid-cols-4 pt-2">
          <Link
            to="/manuals"
            className="flex items-center gap-3 rounded-2xl border border-border p-4 bg-page-bg hover:border-amber-500/40 transition"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Study Handbooks</div>
              <div className="text-xs sm:text-[13px] text-ink-muted">Algebra I formulas</div>
            </div>
          </Link>

          <Link
            to="/learn/coach"
            className="flex items-center gap-3 rounded-2xl border border-border p-4 bg-page-bg hover:border-amber-500/40 transition"
          >
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <MessageCircle size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Ask Vidura AI</div>
              <div className="text-xs sm:text-[13px] text-ink-muted">24/7 Guided Mastery Tutor</div>
            </div>
          </Link>

          <Link
            to="/learn/gap"
            className="flex items-center gap-3 rounded-2xl border border-border p-4 bg-page-bg hover:border-amber-500/40 transition"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Compass size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Gap Analysis</div>
              <div className="text-xs sm:text-[13px] text-ink-muted">Personalized Study Plan</div>
            </div>
          </Link>

          <Link
            to="/learn/analytics"
            className="flex items-center gap-3 rounded-2xl border border-border p-4 bg-page-bg hover:border-amber-500/40 transition"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Skills Passport</div>
              <div className="text-xs sm:text-[13px] text-ink-muted">Verified Credentials</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
