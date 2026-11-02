import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { coachInsights } from "@/data/coach";
import { mockState } from "@/data/mockState";

// TC-12 Coach insights. Paraphrased topics only — no learner identities, sentiment or flags.
export const Route = createFileRoute("/_shell/teacher/coach/insights")({
  head: () => ({
    meta: [
      { title: t("TC-12.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-12.lead") },
      { property: "og:title", content: t("TC-12.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-12.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-12.${k}`, v);

function Page() {
  const state = mockState.teacher.coachInsights;
  const turns = state === "empty" ? [] : coachInsights.turns;
  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />
      {state === "loading" ? <LoadingSkeleton count={4} /> : turns.length === 0 ? <EmptyState title={s("empty")} help="" /> : (
        <>
          <dl className="flex flex-wrap gap-10">
            {[[s("turns"), turns.length], [s("learners"), coachInsights.learnersInFeed]].map(([l, v]) => (
              <div key={l}><dt className="text-sm text-ink-muted">{l}</dt><dd className="font-heading text-[24px] text-ink">{v}</dd></div>
            ))}
          </dl>
          <p className="max-w-reading text-ink-muted">{s("guidance")}</p>
          <section aria-labelledby="recent" className="space-y-3">
            <h2 id="recent" className="font-heading text-[22px] text-ink">{s("recent")}</h2>
            <ul className="space-y-2">
              {turns.map((x) => (
                <li key={x.id} className="rounded-surface border border-border bg-surface p-3 text-ink">
                  <p className="font-semibold">{x.topic}</p>
                  <p className="text-sm text-ink-muted">{s("lesson", { title: x.lesson })}{x.sourced && <> · {s("fromLessons")}</>}</p>
                </li>
              ))}
            </ul>
            {coachInsights.refusals === 0 && <p className="text-ink">{s("noRefusals")}</p>}
          </section>
        </>
      )}
    </div>
  );
}
