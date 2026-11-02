import { useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { HeroBand } from "@/components/shared/HeroBand";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { QuietClassRadar } from "@/components/teacher/QuietClassRadar";
import { WhoLacksWhat } from "@/components/teacher/WhoLacksWhat";
import { classAttempts, type Attempt } from "@/data/attempts";
import { earthingMissCount } from "@/data/teacherInsights";
import { personById } from "@/data/people";
import { checkpointQuiz, historyQuizzes, quizTitle } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";
import { downloadBlob } from "@/lib/download";
import { StatusGem, type GemTone } from "@/components/shared/StatusGem";

// TC-01 Class results. No risk scores, predictions, rankings or colour-coding.
export const Route = createFileRoute("/_shell/teacher/attempts")({
  head: () => ({
    meta: [
      { title: t("TC-01.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-01.lead") },
      { property: "og:title", content: t("TC-01.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-01.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-01.${k}`, v);
const quizzes = [checkpointQuiz, ...historyQuizzes];

const columns: Column<Attempt>[] = [
  { key: "learner", header: s("colLearner"), cell: (a) => personById(a.personId)?.name ?? "" },
  { key: "quiz", header: s("colQuiz"), cell: (a) => quizTitle(a.quizId) },
  { key: "type", header: s("colType"), cell: (a) => s(a.kind) },
  { key: "score", header: s("colScore"), cell: (a) => t("shared.scoreOf", { n: a.score }) },
  { key: "status", header: s("colStatus"), cell: (a) => {
    const tone: GemTone = a.moodleStatus === "sent" ? "synced" : a.moodleStatus === "practice" ? "progress" : "attention";
    return <StatusGem tone={tone}>{t(`shared.moodleStatus.${a.moodleStatus}`)}</StatusGem>;
  } },
  { key: "when", header: s("colSubmitted"), cell: (a) => formatIST(a.submittedAt) },
];

function Page() {
  const id = useId();
  const m = mockState.teacher;
  const loading = m.attempts === "loading";
  const [quiz, setQuiz] = useState("all");
  const [highlightedSkill, setHighlightedSkill] = useState<string | null>(null);
  const all = m.attempts === "empty" ? [] : classAttempts;
  const rows = quiz === "all" ? all : all.filter((a) => a.quizId === quiz);
  const gradedRows = rows.filter((attempt) => attempt.kind === "graded");
  const passRate = gradedRows.length ? Math.round((gradedRows.filter((attempt) => attempt.score / attempt.outOf >= 0.6).length / gradedRows.length) * 100) : 0;

  const downloadJson = () => {
    const payload = { exportedAt: new Date().toISOString(), quizFilter: quiz, attempts: rows };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }), "class-results.json");
  };
  const downloadCsv = () => {
    const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const header = [s("colLearner"), s("colQuiz"), s("colType"), s("colScore"), s("colStatus"), s("colSubmitted")].map(esc).join(",");
    const lines = rows.map((a) => [
      personById(a.personId)?.name ?? "", quizTitle(a.quizId), s(a.kind),
      t("shared.scoreOf", { n: a.score }), t(`shared.moodleStatus.${a.moodleStatus}`), formatIST(a.submittedAt),
    ].map(esc).join(","));
    downloadBlob(new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" }), "class-results.csv");
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="min-w-0">
          <HeroBand><PageHeading text={s("title")} /></HeroBand>
          <p className="mt-1 text-ink">{s("subtitle")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={downloadJson}><Download aria-hidden size={18} />{s("downloadJson")}</button>
          <button type="button" className="btn-secondary" onClick={downloadCsv}><Download aria-hidden size={18} />{s("download")}</button>
        </div>
      </div>
      <p className="max-w-reading text-ink-muted">{s("guidance")}</p>

      {!loading && rows.length > 0 && (
        <>
          <section aria-label={s("passRateLabel")} className="rounded-surface border border-border bg-surface p-5">
            <p className="text-sm font-semibold text-ink-muted">{s("passRateLabel")}</p>
            <p className="mt-1"><CountUp value={passRate} suffix="%" /></p>
            <p className="text-sm text-ink-muted">{s("passRateCount", { passed: gradedRows.filter((attempt) => attempt.score / attempt.outOf >= 0.6).length, total: gradedRows.length })}</p>
          </section>
          <div className="grid gap-6 desktop:grid-cols-2">
            <QuietClassRadar onSkillHighlight={setHighlightedSkill} />
            <WhoLacksWhat highlightedSkill={highlightedSkill} />
          </div>
          <p className="max-w-reading text-ink">
            {t("TC-01.nextStepPre", { n: earthingMissCount })}
            <Link to="/lessons/$lessonId" params={{ lessonId: "3" }} className="text-ink underline">{s("nextStepLesson")}</Link>
            {s("nextStepMid")}
            <Link to="/teacher/ai/remediation" className="text-ink underline">{s("nextStepRemediation")}</Link>
            {s("nextStepPost")}
          </p>
        </>
      )}

      <div className="max-w-xs">
        <label htmlFor={`${id}-q`} className="block font-semibold text-ink">{s("filter")}</label>
        <select id={`${id}-q`} value={quiz} onChange={(e) => setQuiz(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control">
          <option value="all">{s("allQuizzes")}</option>
          {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
      </div>

      {loading ? <LoadingSkeleton variant="table" count={5} /> : (
        <DataTable caption={s("caption")} columns={columns} rows={rows} rowKey={(r) => r.id}
          empty={<EmptyState headingLevel={3} title={s("empty")} help="" />} />
      )}
    </div>
  );
}
