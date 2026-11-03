import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { HeroBand } from "@/components/shared/HeroBand";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { LessonRows, UpNextCard } from "@/components/shared/LessonList";
import { lessons } from "@/data/lessons";
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
      {loading ? <LoadingSkeleton variant="table" count={5} /> : list.length === 0 ? (
        <EmptyState title={s("emptyTitle")} help={s("emptyHelp")} />
      ) : (
        <>
          {next && <UpNextCard lesson={next} />}
          <LessonRows items={list} />
        </>
      )}
    </div>
  );
}
