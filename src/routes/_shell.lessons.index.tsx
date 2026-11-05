import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { HeroBand } from "@/components/shared/HeroBand";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { LessonGrid } from "@/components/shared/LessonList";
import { lessons } from "@/data/lessons";
import { myAttempts } from "@/data/attempts";
import { PercentageBar } from "@/components/shared/PercentageBar";
import { mockState } from "@/data/mockState";

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

function Page() {
  const state = mockState.lessons.list;
  const [loading, setLoading] = useState(state === "loading");
  useEffect(() => {
    if (state !== "loading") return;
    const id = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(id);
  }, [state]);
  const list = state === "empty" ? [] : lessons;
  const next = list.find((lesson) => !lesson.markedDone);

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <HeroBand><PageHeading titleKey="pages.lessons" /></HeroBand>
      {!loading && list.length > 0 && <section aria-label={t("LR-12.summary")} className="grid grid-cols-2 gap-3 tablet:grid-cols-4">{[
        { label: t("LR-12.lessonsDone"), value: `${list.filter((lesson) => lesson.markedDone).length}/${list.length}`, tone: "border-l-secondary" },
        { label: t("LR-12.attempts"), value: String(myAttempts.length), tone: "border-l-accent" },
        { label: t("LR-12.average"), value: `${myAttempts.length ? Math.round(myAttempts.reduce((sum, attempt) => sum + attempt.score / attempt.outOf * 100, 0) / myAttempts.length) : 0}%`, tone: "border-l-metric" },
        { label: t("LR-12.passMark", { n: mockState.analytics.passMark }), value: `${Math.round(list.filter((lesson) => lesson.markedDone).length / list.length * 100)}%`, tone: "border-l-success" },
      ].map((stat) => <article key={stat.label} className={`rounded-surface border border-border border-l-4 ${stat.tone} bg-surface p-4 shadow-sm`}><p className="text-sm text-ink-muted">{stat.label}</p><p className="mt-2 font-heading text-2xl font-extrabold text-ink">{stat.value}</p>{stat.value.endsWith("%") && <div className="mt-2"><PercentageBar value={Number.parseFloat(stat.value)} /></div>}</article>)}</section>}
      {loading ? <LoadingSkeleton variant="table" count={5} /> : list.length === 0 ? (
        <EmptyState title={s("emptyTitle")} help={s("emptyHelp")} />
      ) : (
        <LessonGrid items={list} upNextId={next?.id} />
      )}
    </div>
  );
}
