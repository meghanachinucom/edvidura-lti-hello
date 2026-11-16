import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { HeroBand } from "@/components/shared/HeroBand";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { LessonGrid } from "@/components/shared/LessonList";
import { lessons as fallbackLessons, type Lesson } from "@/data/lessons";
import { myAttempts, type Attempt } from "@/data/attempts";
import { PercentageBar } from "@/components/shared/PercentageBar";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
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
            // Fallback to static lessons when unauthenticated or offline prototype
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
      <HeroBand>
        <PageHeading titleKey="pages.lessons" />
      </HeroBand>
      {error && <ErrorAlert message={error} />}
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
              className={`rounded-surface border border-border border-l-4 ${stat.tone} bg-surface p-4 shadow-sm`}
            >
              <p className="text-sm text-ink-muted">{stat.label}</p>
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
        <LessonGrid items={list} upNextId={next?.id} />
      )}
    </div>
  );
}
