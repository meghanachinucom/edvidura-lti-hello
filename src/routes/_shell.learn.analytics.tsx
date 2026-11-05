import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChartTable } from "@/components/shared/BarChartTable";
import { myAttempts, type Attempt } from "@/data/attempts";
import { lessons } from "@/data/lessons";
import { quizTitle } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";
import { PercentageBar } from "@/components/shared/PercentageBar";
import { LearnerFocusAnalytics } from "@/components/learner/LearnerFocusAnalytics";

// LR-12 My analytics. Own evidence only — no comparisons or predictions.
export const Route = createFileRoute("/_shell/learn/analytics")({
  head: () => ({
    meta: [
      { title: t("pages.learnAnalytics") + t("app.titleSuffix") },
      { name: "description", content: t("LR-12.lead") },
      { property: "og:title", content: t("pages.learnAnalytics") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-12.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-12.${k}`, v);

const columns: Column<Attempt>[] = [
  { key: "when", header: t("LR-03.colWhen"), cell: (a) => formatIST(a.submittedAt) },
  { key: "quiz", header: t("LR-03.colQuiz"), cell: (a) => quizTitle(a.quizId) },
  { key: "type", header: t("LR-03.colType"), cell: (a) => t(a.kind === "graded" ? "LR-03.typeGraded" : "LR-03.typePractice") },
  { key: "score", header: t("LR-03.colScore"), cell: (a) => t("shared.scoreOf", { n: a.score }) },
  { key: "moodle", header: t("LR-03.colMoodle"), cell: (a) => t(`shared.moodleStatus.${a.moodleStatus}`) },
];

function Page() {
  const m = mockState.analytics;
  const rows = m.attempts === "empty" ? [] : [...myAttempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const done = lessons.filter((l) => l.markedDone).length;
  const pct = (a: Attempt) => (a.score / a.outOf) * 100;
  const avg = rows.length ? Math.round(rows.reduce((x, a) => x + pct(a), 0) / rows.length) : 0;
  const best = rows.reduce((x, a) => Math.max(x, a.score), 0);
  const below = rows.filter((a) => pct(a) < m.passMark).length;

  const stats = [
    { label: s("lessonsDone"), value: s("lessonsValue", { n: done, total: lessons.length }) },
    ...(rows.length ? [
      { label: s("attempts"), value: String(rows.length) },
      { label: s("average"), value: `${avg}%` },
      { label: s("best"), value: t("shared.scoreOf", { n: best }) },
      { label: s("belowPass"), value: String(below) },
    ] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading titleKey="pages.learnAnalytics" />
      <p className="max-w-reading text-ink">{s("lead")}</p>
      <LearnerFocusAnalytics />

      <section aria-label={s("summary")}>
        <dl className="grid grid-cols-2 gap-4 tablet:flex tablet:flex-wrap tablet:gap-10">
          {stats.map((x) => (
            <div key={x.label} className="kpi-figure tablet:min-w-36">
              <dt className="text-sm text-ink-muted">{x.label}</dt>
              <dd><CountUp value={x.value} /></dd>
              {x.value.endsWith("%") && <div className="mt-2"><PercentageBar value={Number.parseFloat(x.value)} /></div>}
            </div>
          ))}
        </dl>
        {rows.length > 0 && <p className="mt-3 text-ink">{s("passMark", { n: m.passMark })}</p>}
      </section>

      {rows.length > 0 && (
        <BarChartTable
          title={s("recent")}
          summary={s("passMark", { n: m.passMark })}
          rows={[...rows].reverse().map((a) => ({ label: quizTitle(a.quizId), value: Math.round(pct(a)) }))}
          colLabel={t("LR-03.colQuiz")} valueLabel={t("LR-03.colScore")}
          format={(v) => `${v}%`} percentage
        />
      )}

      <section aria-labelledby="recent">
        <h2 id="recent" className="sr-only">{s("recent")}</h2>
        <DataTable caption={s("recent")} columns={columns} rows={rows} rowKey={(r) => r.id}
          empty={<EmptyState headingLevel={3} title={s("empty")} help="" />} />
      </section>

      <div className="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-4">
        <Link to="/quiz" className="btn-primary">{s("takeQuiz")}</Link>
        <Link to="/learn/gap" className="inline-flex min-h-11 items-center text-ink underline">{s("plan")}</Link>
        <Link to="/active-quizzes" className="inline-flex min-h-11 items-center text-ink underline">{s("practise")}</Link>
        <Link to="/learn/activity" className="inline-flex min-h-11 items-center text-ink underline">{s("activity")}</Link>
      </div>
    </div>
  );
}
