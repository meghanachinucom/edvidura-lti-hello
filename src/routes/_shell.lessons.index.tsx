import { StatusGem } from "@/components/shared/StatusGem";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { HeroBand } from "@/components/shared/HeroBand";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { lessons } from "@/data/lessons";
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
                  <span className="block text-[18px] font-semibold">{next.title}</span>
                </span>
                <ChevronRight aria-hidden className="shrink-0 text-accent" />
              </Link>
            </section>
          )}
          <section aria-labelledby="all-lessons">
            <h2 id="all-lessons" className="sr-only">{s("list")}</h2>
            <ol className="divide-y divide-border rounded-surface border border-border bg-surface">
              {list.map((l) => (
                <li key={l.id}>
                  <Link to="/lessons/$lessonId" params={{ lessonId: l.id }}
                    className={`flex min-h-14 items-center gap-3 px-4 py-3 ${l.markedDone ? "text-ink-muted" : "text-ink"}`}>
                    <span aria-hidden className="w-6 shrink-0 font-semibold">{l.order}</span>
                    <span className="min-w-0 flex-1">
                      <span className="sr-only">{s("lessonN", { n: l.order })}: </span>
                      <span className="block font-medium">{l.title}</span>
                      <span className="block text-sm">
                        {t(`shared.lessonKind.${l.kind}`)} · <StatusGem tone={l.markedDone ? "done" : "notStarted"}>{l.markedDone ? s("done") : s("todo")}</StatusGem>
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={18} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
