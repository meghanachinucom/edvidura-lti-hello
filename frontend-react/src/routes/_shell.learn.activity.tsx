import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Trophy,
  Rotate3d,
  Layers,
  Filter,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { learnerActivity, type ActivityRow } from "@/data/activity";
import { formatIST } from "@/lib/time";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/learn/activity")({
  head: () => ({
    meta: [
      { title: t("pages.learnActivity") + t("app.titleSuffix") },
      {
        name: "description",
        content:
          "Track your personal Class 8 learning milestones, quizzes, reading sessions, and tutor chats.",
      },
    ],
  }),
  component: Page,
});

export function Page() {
  const [filter, setFilter] = useState<"all" | "lessons" | "quizzes" | "ebooks" | "coach">("all");
  const [streamEvents, setStreamEvents] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get<{ events?: any[] }>("/api/v1/events/stream")
      .then((res) => {
        if (active && res && Array.isArray(res.events)) {
          setStreamEvents(res.events);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Merge live stream events for Alice into timeline
  const liveRows: ActivityRow[] = streamEvents
    .filter((e) => e.actor?.id === "6" || e.actor_id === "6")
    .map((e, idx) => ({
      id: e.event_id || `live-${idx}`,
      personId: "6",
      personName: "Alice Nguyen",
      action:
        e.event_type === "quiz_question_mastered"
          ? "Submitted quiz"
          : e.event_type === "ebook_audio_completed"
            ? "Completed chapter"
            : e.event_type === "tutor_hint_ladder_unlocked"
              ? "Chatted with Vidura"
              : "Marked lesson done",
      item: e.object || "Class 8 Algebra Learning Event",
      at: e.ingested_at || new Date().toISOString(),
      kind: e.event_type?.includes("quiz")
        ? "quizzes"
        : e.event_type?.includes("ebook")
          ? "ebooks"
          : e.event_type?.includes("tutor")
            ? "coach"
            : "lessons",
      detail: e.payload?.detail || "Recorded live in learning event stream.",
    }));

  const allActivities = [...liveRows, ...learnerActivity];
  const filtered =
    filter === "all" ? allActivities : allActivities.filter((a) => a.kind === filter);

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      {/* Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          text="My Learning Timeline"
          context="Chronological record of your completed lessons, practice quizzes, textbook reading, and Ask Vidura tutor sessions."
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Sync Active</span>
        </span>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Activities This Week</span>
            <Layers size={16} className="text-secondary" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-ink">{allActivities.length}</p>
          <p className="text-xs text-secondary mt-1 font-semibold">Continuous learning streak</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Study Time</span>
            <Clock size={16} className="text-teal-600" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-ink">4 hrs 15m</p>
          <p className="text-xs text-teal-700 mt-1 font-semibold">Across 4 curriculum topics</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Quizzes Passed</span>
            <Trophy size={16} className="text-amber-500" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-emerald-700">100%</p>
          <p className="text-xs text-ink-muted mt-1 font-semibold">3 attempts / 3 passed</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Chapters Read</span>
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-ink">4 Chapters</p>
          <p className="text-xs text-indigo-700 mt-1 font-semibold">With audio narration</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-ink mr-2 flex items-center gap-1">
            <Filter size={14} className="text-secondary" /> Filter:
          </span>
          {[
            { id: "all", label: "All Activities", count: allActivities.length },
            {
              id: "lessons",
              label: "Lessons & 3D Labs",
              count: allActivities.filter((a) => a.kind === "lessons").length,
            },
            {
              id: "quizzes",
              label: "Quizzes",
              count: allActivities.filter((a) => a.kind === "quizzes").length,
            },
            {
              id: "ebooks",
              label: "eBooks",
              count: allActivities.filter((a) => a.kind === "ebooks").length,
            },
            {
              id: "coach",
              label: "Ask Vidura",
              count: allActivities.filter((a) => a.kind === "coach").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                filter === tab.id
                  ? "bg-secondary text-white shadow-xs"
                  : "bg-surface border border-slate-200 text-slate-600 hover:text-secondary hover:border-secondary"
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1 opacity-75 text-xs">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Timeline Cards */}
      {filtered.length === 0 ? (
        <EmptyState title="No activities found" help="Try selecting a different filter above." />
      ) : (
        <div className="space-y-4">
          {filtered.map((item, idx) => {
            const isQuiz = item.kind === "quizzes";
            const isEbook = item.kind === "ebooks";
            const isCoach = item.kind === "coach";
            const isLab = item.action === "3D Lab Simulated";

            return (
              <div
                key={item.id || idx}
                className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs hover:border-secondary/40 transition"
              >
                {/* Category Icon Badge */}
                <div
                  className={`size-11 shrink-0 rounded-2xl flex items-center justify-center ${
                    isQuiz
                      ? "bg-amber-100 text-amber-800"
                      : isEbook
                        ? "bg-indigo-100 text-indigo-800"
                        : isCoach
                          ? "bg-teal-100 text-teal-800"
                          : isLab
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isQuiz ? (
                    <Trophy size={20} />
                  ) : isEbook ? (
                    <BookOpen size={20} />
                  ) : isCoach ? (
                    <MessageSquare size={20} />
                  ) : isLab ? (
                    <Rotate3d size={20} />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isQuiz
                          ? "text-amber-700"
                          : isEbook
                            ? "text-indigo-700"
                            : isCoach
                              ? "text-teal-700"
                              : "text-emerald-700"
                      }`}
                    >
                      {item.action}
                    </span>
                    <span className="text-xs font-mono font-medium text-ink-muted">
                      {formatIST(item.at)}
                    </span>
                  </div>

                  <h3 className="font-heading text-base font-bold text-ink mt-0.5 truncate">
                    {item.item}
                  </h3>

                  {item.detail && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                      {item.detail}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-slate-100 text-xs">
                    {item.score !== undefined && item.maxScore && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Score: {item.score}/{item.maxScore} (
                        {Math.round((item.score / item.maxScore) * 100)}%)
                      </span>
                    )}
                    {item.durationMins && (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                        <Clock size={12} /> {item.durationMins} minutes study
                      </span>
                    )}
                    <span className="text-ink-muted font-mono text-xs">
                      Student ID: {item.personId}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
