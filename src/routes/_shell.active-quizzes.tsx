import { StatusGem } from "@/components/shared/StatusGem";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Dumbbell } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { myAttempts, type Attempt } from "@/data/attempts";
import { checkpointQuiz, quizTitle } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";

// LR-03 Quizzes.
export const Route = createFileRoute("/_shell/active-quizzes")({
  head: () => ({
    meta: [
      { title: t("pages.activeQuizzes") + t("app.titleSuffix") },
      { name: "description", content: t("LR-03.history") },
      { property: "og:title", content: t("pages.activeQuizzes") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-03.history") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-03.${k}`, v);

function TypeLabel({ kind }: { kind: "graded" | "practice" }) {
  const Icon = kind === "graded" ? Award : Dumbbell;
  return (
    <span className={`inline-flex items-center gap-1 rounded-surface border px-2 py-0.5 text-sm font-medium ${kind === "graded" ? "border-ink text-ink" : "border-dashed border-border-control text-ink"}`}>
      <Icon aria-hidden size={16} />{s(kind)}
    </span>
  );
}

const cards = [{ quiz: checkpointQuiz, kind: "graded" as const, submitted: false }];

const columns: Column<Attempt>[] = [
  { key: "when", header: s("colWhen"), cell: (a) => formatIST(a.submittedAt) },
  { key: "quiz", header: s("colQuiz"), cell: (a) => quizTitle(a.quizId) },
  { key: "type", header: s("colType"), cell: (a) => (a.kind === "graded" ? s("typeGraded") : s("typePractice")) },
  { key: "score", header: s("colScore"), cell: (a) => t("shared.scoreOf", { n: a.score }) },
  { key: "moodle", header: s("colMoodle"), cell: (a) => t(`shared.moodleStatus.${a.moodleStatus}`) },
  { key: "review", header: s("colReview"), cell: (a) => (
    <Link to="/quiz/result/$attemptId" params={{ attemptId: a.id }} className="inline-flex min-h-11 items-center text-ink underline">
      {s("reviewLink")}<span className="sr-only">: {quizTitle(a.quizId)}</span>
    </Link>
  ) },
];

function Page() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), mockState.quiz.loadingMs);
    return () => clearTimeout(id);
  }, []);
  const rows = mockState.quiz.history === "empty" ? [] : [...myAttempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      <PageHeading titleKey="pages.activeQuizzes" />
      {loading ? <LoadingSkeleton variant="table" count={4} /> : (
        <>
          <section aria-label={s("cardsLabel")}>
            <ul className="grid gap-3 tablet:grid-cols-2">
              {cards.map(({ quiz, kind, submitted }) => (
                <li key={quiz.id} className={`rounded-surface bg-surface p-4 ${kind === "graded" ? "border-2 border-ink" : "border-2 border-dashed border-border-control"}`}>
                  <TypeLabel kind={kind} />
                  <h2 className="mt-2 font-heading text-[20px] text-ink">{quiz.title}</h2>
                  <p className="mt-1 text-ink-muted"><StatusGem tone={submitted ? "done" : "notStarted"}>{submitted ? s("submitted") : s("notStarted")}</StatusGem></p>
                  <Link to="/quiz" className="btn-primary mt-3">{submitted ? s("review") : s("start")}</Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="history">
            <h2 id="history" className="sr-only">{s("history")}</h2>
            <DataTable caption={s("history")} columns={columns} rows={rows} rowKey={(r) => r.id}
              empty={<EmptyState headingLevel={3} title={s("emptyTitle")} help={s("emptyHelp")}
                action={<Link to="/quiz" className="btn-primary">{s("start")}</Link>} />} />
          </section>
        </>
      )}
    </div>
  );
}
