import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, ChevronRight, Clock, PlayCircle, Sparkles } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { lessons as fallbackLessons, type Lesson } from "@/data/lessons";
import { myAttempts, type Attempt } from "@/data/attempts";
import { PercentageBar } from "@/components/shared/PercentageBar";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { AdaptivePathwayBanner } from "@/components/enterprise/AdaptivePathwayBanner";
import { OfflineSyncPill } from "@/components/enterprise/OfflineSyncPill";
import {
  adaptLessons,
  adaptAttempts,
  type BackendLessonItem,
  type BackendAttemptCard,
} from "@/lib/adapters";

export const Route = createFileRoute("/_shell/lessons/")({
  head: () => ({
    meta: [
      { title: t("pages.lessons") + t("app.titleSuffix") },
      { name: "description", content: t("LR-01.list") },
      { property: "og:title", content: t("pages.lessons") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-01.list") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`LR-01.${k}`);

interface LessonsApiResponse {
  course?: { id: string; slug: string; title: string };
  lessons: BackendLessonItem[];
}

interface AttemptsApiResponse {
  attempts: BackendAttemptCard[];
}

function Page() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Lesson[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLessons() {
      setLoading(true);
      setError(null);
      try {
        const [lessonsResp, attemptsResp] = await Promise.all([
          api.get<LessonsApiResponse>("/api/v1/app/lessons").catch((err) => {
            console.warn("Lessons API fallback:", err);
            return null;
          }),
          api.get<AttemptsApiResponse>("/api/v1/app/attempts").catch((err) => {
            console.warn("Attempts API fallback:", err);
            return null;
          }),
        ]);

        if (active) {
          if (lessonsResp?.lessons) {
            setList(adaptLessons(lessonsResp.lessons));
          } else {
            setList(mockState.lessons.list === "empty" ? [] : fallbackLessons);
          }

          if (attemptsResp?.attempts) {
            setAttempts(adaptAttempts(attemptsResp.attempts));
          } else {
            setAttempts(myAttempts);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load lessons");
          setList(fallbackLessons);
          setLoading(false);
        }
      }
    }
    loadLessons();
    return () => {
      active = false;
    };
  }, []);

  const next = list.find((lesson) => !lesson.markedDone);
  const doneCount = list.filter((lesson) => lesson.markedDone).length;
  const attemptsCount = attempts.length;
  const averagePct = attemptsCount
    ? Math.round(
        attempts.reduce((sum, a) => sum + (a.score / (a.outOf || 5)) * 100, 0) / attemptsCount,
      )
    : 0;
  const completionPct = list.length ? Math.round((doneCount / list.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          titleKey="pages.lessons"
          context="Structured curriculum units, interactive checkpoints, and self-paced mastery lessons."
        />
        <OfflineSyncPill />
      </div>

      <AdaptivePathwayBanner studentId="6" />

      {error && <ErrorAlert message={error} />}

      {/* KPI Stats Strip */}
      {!loading && list.length > 0 && (
        <section
          aria-label={t("LR-12.summary")}
          className="grid grid-cols-2 gap-3 tablet:grid-cols-4"
        >
          {[
            {
              label: t("LR-12.lessonsDone"),
              value: `${doneCount}/${list.length}`,
              tone: "border-l-secondary",
            },
            {
              label: t("LR-12.attempts"),
              value: String(attemptsCount),
              tone: "border-l-accent",
            },
            {
              label: t("LR-12.average"),
              value: `${averagePct}%`,
              tone: "border-l-metric",
            },
            {
              label: t("LR-12.passMark", { n: mockState.analytics.passMark }),
              value: `${completionPct}%`,
              tone: "border-l-success",
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className={`rounded-surface border border-border border-l-4 ${stat.tone} bg-surface p-4 shadow-xs`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {stat.label}
              </p>
              <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{stat.value}</p>
              {stat.value.endsWith("%") && (
                <div className="mt-2">
                  <PercentageBar value={Number.parseFloat(stat.value)} />
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : list.length === 0 ? (
        <EmptyState title={s("emptyTitle")} help={s("emptyHelp")} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-extrabold text-ink">
                Class 8 Curriculum Modules & Chapters
              </h2>
              <p className="text-xs text-ink-muted">
                Each chapter contains masterclass video checkpoints, concept breakdowns, and synchronous notes.
              </p>
            </div>
            <span className="text-xs font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
              {doneCount} of {list.length} Chapters Completed
            </span>
          </div>

          {/* Spacious Chapter List */}
          <div className="grid grid-cols-1 gap-5">
            {list.map((item, index) => {
              const chapterNum = index + 1;
              const isDone = item.markedDone;
              const isUpNext = item.id === next?.id;
              const progressPct = isDone ? 100 : isUpNext ? 45 : 0;

              return (
                <div
                  key={item.id}
                  className={`group rounded-2xl border transition-all duration-200 bg-surface p-6 shadow-xs hover:shadow-md ${
                    isUpNext
                      ? "border-secondary/40 ring-1 ring-secondary/20 bg-gradient-to-r from-secondary/[0.02] to-transparent"
                      : "border-border hover:border-border-focus"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl font-heading font-extrabold text-base ${
                          isDone
                            ? "bg-emerald-100 text-emerald-800"
                            : isUpNext
                              ? "bg-secondary text-white shadow-xs"
                              : "bg-surface-sunken text-ink-muted border border-border"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={24} className="text-emerald-700" />
                        ) : (
                          `Ch ${chapterNum}`
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                            Chapter {chapterNum} · {item.kind === "video" ? "Interactive Video" : "Core Module"}
                          </span>

                          {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : isUpNext ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/30">
                              <Sparkles size={12} /> Up Next
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken text-ink-muted border border-border">
                              Not Started
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-heading font-extrabold text-ink group-hover:text-secondary transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-sm text-ink-muted leading-relaxed max-w-3xl">
                          {(item as { summary?: string }).summary ||
                            "Explore step-by-step mathematical reasoning, industrial balance models, and formative checkpoints."}
                        </p>

                        {/* Progress Bar inside Chapter Card */}
                        <div className="pt-2 max-w-md">
                          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted mb-1">
                            <span>Chapter Progress</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDone ? "bg-emerald-500" : isUpNext ? "bg-secondary" : "bg-transparent"
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pt-2 md:pt-0">
                      <Link
                        to="/lessons/$lessonId"
                        params={{ lessonId: item.id }}
                        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-xs transition-all ${
                          isUpNext
                            ? "bg-secondary text-white hover:bg-secondary-hover shadow-sm"
                            : "bg-surface-sunken hover:bg-border text-ink border border-border"
                        }`}
                      >
                        <span>{isDone ? "Review Chapter" : "Open Chapter"}</span>
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
