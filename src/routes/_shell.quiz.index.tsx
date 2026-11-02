import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { EmptyState } from "@/components/shared/EmptyState";
import { QuizSession } from "@/components/learner/QuizSession";
import { QuizModeBadge } from "@/components/shared/QuizModeBadge";
import { checkpointQuiz } from "@/data/quiz";
import { lessons } from "@/data/lessons";
import { myAttempts } from "@/data/attempts";
import { mockState } from "@/data/mockState";

// "/quiz" serves both the Quiz gate (LR-04) and the Quiz session (Batch L3), switched by mockState.quiz.mode.
export const Route = createFileRoute("/_shell/quiz/")({
  head: () => ({
    meta: [
      { title: checkpointQuiz.title + t("app.titleSuffix") },
      { name: "description", content: t("LR-04.graded") },
      { property: "og:title", content: checkpointQuiz.title + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-04.graded") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-04.${k}`, v);

function Page() {
  // In-memory only: "Start quiz" switches this page to the session without changing the address.
  const [started, setStarted] = useState(false);
  if (started || mockState.quiz.mode === "session") return <QuizSession />;
  return <Gate onStart={() => setStarted(true)} />;
}

function Gate({ onStart }: { onStart: () => void }) {
  const q = mockState.quiz;
  if (q.gate === "unavailable") return <AccessUnavailable />;
  const done = lessons.filter((l) => l.markedDone).length;
  const lastGraded = myAttempts.filter((a) => a.kind === "graded").sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const next = lessons.find((l) => !l.markedDone && l.kind !== "quiz");

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      <div>
        <PageHeading text={checkpointQuiz.title} />
        <p className="mt-2 max-w-reading text-ink"><QuizModeBadge kind={q.gateType} /></p>
      </div>

      <section aria-labelledby="gate-progress">
        <h2 id="gate-progress" className="font-heading text-[22px] text-ink">{s("progress")}</h2>
        <ul className="mt-3 space-y-1 text-ink">
          <li>{s("lessonsDone", { n: done, total: lessons.length })}</li>
          {lastGraded && <li>{s("lastGraded", { n: lastGraded.score })}</li>}
        </ul>
      </section>

      {next && (
        <section aria-labelledby="gate-rec">
          <h2 id="gate-rec" className="font-heading text-[22px] text-ink">{s("recommended")}</h2>
          <Link to="/lessons/$lessonId" params={{ lessonId: next.id }}
            className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-surface border-l-4 border-accent bg-surface p-4 text-ink">
            <span className="min-w-0">
              <span className="block text-sm text-ink-muted">{s("keepGoing")}</span>
              <span className="block text-[18px] font-semibold">{next.title}</span>
            </span>
            <ChevronRight aria-hidden className="shrink-0 text-accent" />
          </Link>
        </section>
      )}

      <div>
        {q.gate === "noQuestions" ? <EmptyState title={s("noQuestions")} help="" /> :
          q.gate === "submitted" ? (
            <Link to="/quiz/result/$attemptId" params={{ attemptId: q.submittedAttemptId }} className="btn-primary">{s("viewResult")}</Link>
          ) : (
            <button type="button" className="btn-primary" onClick={onStart}>{s("start")}</button>
          )}
      </div>

      <section aria-labelledby="gate-other">
        <h2 id="gate-other" className="font-heading text-[22px] text-ink">{s("other")}</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6">
          <li><Link to="/lessons" className="inline-flex min-h-11 items-center text-ink underline">{s("lessons")}</Link></li>
          <li><Link to="/manuals" className="inline-flex min-h-11 items-center text-ink underline">{s("ebooks")}</Link></li>
        </ul>
      </section>
    </div>
  );
}
