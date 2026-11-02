import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { BarChartTable } from "@/components/shared/BarChartTable";
import { classAttempts } from "@/data/attempts";
import { checkpointQuiz, historyQuizzes } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { PercentageBar } from "@/components/shared/PercentageBar";
import { Download } from "lucide-react";
import { downloadBlob } from "@/lib/download";

// TC-03 Analytics. Class scope only — no risk flags, mastery, time-on-task or rankings.
export const Route = createFileRoute("/_shell/teacher/analytics")({
  head: () => ({
    meta: [
      { title: t("TC-03.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-03.lead") },
      { property: "og:title", content: t("TC-03.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-03.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-03.${k}`, v);
const pct = (score: number, outOf: number) => Math.round((score / outOf) * 100);

function Page() {
  const state = mockState.teacher.analytics;
  const rows = state === "empty" ? [] : classAttempts;
  const avg = rows.length ? pct(rows.reduce((x, a) => x + a.score, 0), rows.length * 5) : 0;
  const practice = rows.filter((a) => a.kind === "practice").length;
  const waiting = rows.filter((a) => a.kind === "graded" && a.moodleStatus !== "sent").length;
  const modules = [...historyQuizzes, checkpointQuiz]
    .map((q) => { const as = rows.filter((a) => a.quizId === q.id); return { title: q.title, value: as.length ? pct(as.reduce((x, a) => x + a.score, 0), as.length * 5) : null }; })
    .filter((m): m is { title: string; value: number } => m.value !== null);
  const sorted = [...modules].sort((a, b) => a.value - b.value);
  const exportJson = () => downloadBlob(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), average: avg, practiceAttempts: practice, gradebookWaiting: waiting, modules }, null, 2)], { type: "application/json;charset=utf-8" }), "class-analytics.json");
  const exportCsv = () => {
    const esc = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const lines = [
      [s("colModule"), s("colScore")].map(esc).join(","),
      ...modules.map((module) => [module.title, `${module.value}%`].map(esc).join(",")),
    ];
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), "class-analytics.csv");
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="min-w-0">
          <PageHeading text={s("title")} />
          <p className="mt-1 text-ink">{s("scope")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={exportJson}><Download aria-hidden size={18} />{s("exportJson")}</button>
          <button type="button" className="btn-secondary" onClick={exportCsv}><Download aria-hidden size={18} />{s("exportCsv")}</button>
        </div>
      </div>

      {state === "loading" ? <LoadingSkeleton count={4} /> : rows.length === 0 ? (
        <EmptyState title={s("empty")} help="" />
      ) : (
        <>
          <section aria-label={s("summary")}>
            <dl className="grid grid-cols-2 gap-4 tablet:flex tablet:flex-wrap tablet:gap-10">
              {[[s("average"), `${avg}%`], [s("practice"), String(practice)], [s("waiting"), String(waiting)]].map(([l, v]) => (
                <div key={l} className="kpi-figure tablet:min-w-36">
                  <dt className="text-sm text-ink-muted">{l}</dt>
                  <dd><CountUp value={v ?? "0"} /></dd>
                  {v?.endsWith("%") && <div className="mt-2"><PercentageBar value={Number.parseFloat(v)} /></div>}
                </div>
              ))}
            </dl>
          </section>

          <BarChartTable
            title={s("chart")}
            summary={s("chartSummary", { low: sorted[0]?.title ?? "", lowN: sorted[0]?.value ?? 0, high: sorted[sorted.length - 1]?.title ?? "", highN: sorted[sorted.length - 1]?.value ?? 0 })}
            rows={modules.map((m) => ({ label: m.title, value: m.value }))}
            colLabel={s("colModule")} valueLabel={s("colScore")}
            format={(v) => `${v}%`} percentage
          />
          <ul aria-label={s("chartLegend")} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
            {modules.map((module, index) => <li key={module.title} className="flex items-center gap-2"><span aria-hidden className="size-3 rounded-sm" style={{ backgroundColor: ["var(--accent)", "var(--secondary)", "var(--tertiary)", "var(--metric)"][index % 4] }} />{module.title}</li>)}
          </ul>
          <p className="max-w-reading text-ink-muted">{s("guidance")}</p>
        </>
      )}
    </div>
  );
}
