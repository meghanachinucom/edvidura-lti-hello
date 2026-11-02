import { StatusGem } from "@/components/shared/StatusGem";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CirclePlay, ClipboardCheck, ChevronRight } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { HeroBand } from "@/components/shared/HeroBand";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { lessons } from "@/data/lessons";
import { classes } from "@/data/course";
import { mockState } from "@/data/mockState";

// LR-01 Lessons.
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

const s = (k: string, v?: Record<string, string | number>) => t(`LR-01.${k}`, v);

function Page() {
  const state = mockState.lessons.list;
  const [loading, setLoading] = useState(state === "loading");
  useEffect(() => {
    if (state !== "loading") return;
    const id = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(id);
  }, [state]);
  const list = state === "empty" ? [] : lessons;
  const next = list.find((l) => !l.markedDone);

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <HeroBand><PageHeading titleKey="pages.lessons" /></HeroBand>
      {loading ? <LoadingSkeleton variant="table" count={5} /> : list.length === 0 ? (
        <EmptyState title={s("emptyTitle")} help={s("emptyHelp")} />
      ) : (
        <>
          {next && (
            <section aria-labelledby="up-next">
              <h2 id="up-next" className="font-heading text-[22px] text-ink">{s("upNext")}</h2>
              <Link to="/lessons/$lessonId" params={{ lessonId: next.id }}
                className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-surface border-l-4 border-accent bg-surface p-4 text-ink">
                <span className="min-w-0">
                  <span className="block text-sm text-ink-muted">{t(`shared.lessonKind.${next.kind}`)}</span>
                  <span className="block text-[18px] font-semibold">{next.title} <span className="font-mono text-sm text-ink-muted">{classes[0]?.code}</span></span>
                </span>
                <ChevronRight aria-hidden className="shrink-0 text-accent" />
              </Link>
            </section>
          )}
          <section aria-labelledby="all-lessons">
            <h2 id="all-lessons" className="sr-only">{s("list")}</h2>
            <ol className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-3">
              {list.map((l) => {
                const TopicIcon = l.kind === "video" ? CirclePlay : l.kind === "quiz" ? ClipboardCheck : BookOpen;
                return (
                  <li key={l.id} className="min-w-0">
                    <Link to="/lessons/$lessonId" params={{ lessonId: l.id }}
                      className={`group flex h-full min-h-64 flex-col rounded-surface border border-border bg-surface p-4 text-ink shadow-sm transition-shadow hover:shadow-md ${l.markedDone ? "opacity-80" : ""}`}>
                      <span className="flex aspect-square max-h-48 w-full items-center justify-center rounded-surface bg-secondary-container text-secondary" aria-hidden>
                        <TopicIcon size={64} strokeWidth={1.5} />
                      </span>
                      <span className="mt-4 flex items-start gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">{s("lessonN", { n: l.order })} · {t(`shared.lessonKind.${l.kind}`)}</span>
                          <span className="mt-1 block font-heading text-lg font-semibold">{l.title}</span>
                          <span className="mt-1 block font-mono text-sm text-ink-muted">{classes[0]?.code}</span>
                        </span>
                        <ChevronRight aria-hidden size={18} className="mt-1 shrink-0 text-secondary transition-transform group-hover:translate-x-1" />
                      </span>
                      <span className="mt-auto pt-3 text-sm"><StatusGem tone={l.markedDone ? "done" : "notStarted"}>{l.markedDone ? s("done") : s("todo")}</StatusGem></span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
