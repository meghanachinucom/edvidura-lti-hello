import { PillTabs } from "@/components/shared/PillTabs";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { LoopStepper } from "@/components/shared/LoopStepper";
import { myAttempts, type Attempt } from "@/data/attempts";
import { attemptAnswers } from "@/data/attemptAnswers";
import { quizTitle } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { downloadBlob } from "@/lib/download";

// LR-06 Quiz result.
export const Route = createFileRoute("/_shell/quiz/result/$attemptId")({
  head: () => ({
    meta: [
      { title: t("LR-06.title") + t("app.titleSuffix") },
      { name: "description", content: t("LR-06.breakdown") },
      { property: "og:title", content: t("LR-06.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-06.breakdown") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-06.${k}`, v);

function Page() {
  const { attemptId } = Route.useParams();
  const attempt = myAttempts.find((a) => a.id === attemptId);
  // Unknown record: neutral "not available" page, never confirming it exists elsewhere.
  if (!attempt) return <AccessUnavailable />;
  return <Result attempt={attempt} />;
}

// M3: the four gradebook lines, switched by the on-page prototype control.
type GradebookState = "sent" | "practice" | "error" | "unavailable";
const GB_VARIANT: Record<GradebookState, "success" | "warning" | "info"> = {
  sent: "success", practice: "info", error: "warning", unavailable: "warning",
};
const GB_ORDER: GradebookState[] = ["sent", "practice", "error", "unavailable"];

function Result({ attempt }: { attempt: Attempt }) {
  const m = mockState.quiz;
  const rows = (attemptAnswers[attempt.id] ?? []).map((r) => (m.resultNoMisses ? { ...r, given: r.correctAnswer, correct: true } : r));
  const score = rows.filter((r) => r.correct).length;
  const missed = rows.some((r) => !r.correct);
  const [gb, setGb] = useState<GradebookState>("sent");

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      <div>
        <PageHeading text={s("title")} />
        <p className="mt-1 text-ink-muted">{quizTitle(attempt.quizId)}</p>
        <p className="mt-4 font-heading text-[52px] font-extrabold leading-tight text-accent">{s("score", { n: score })}</p>
        <p className="mt-1 text-ink">{attempt.kind === "graded" ? s("graded") : s("practice")}</p>
      </div>

      <StatusBanner variant={GB_VARIANT[gb]}>{s(`gb.${gb}`)}</StatusBanner>

      <div className="max-w-reading">
        <p className="block font-semibold text-ink">{s("gb.label")}</p>
        <div className="mt-2 overflow-x-auto"><PillTabs label={s("gb.label")} active={gb}
          items={GB_ORDER.map((g) => ({ id: g, label: s(`gb.${g}`), onSelect: () => setGb(g) }))} /></div>
      </div>

      <section aria-labelledby="breakdown">
        <h2 id="breakdown" className="font-heading text-[22px] text-ink">{s("breakdown")}</h2>
        <ol className="mt-3 space-y-3">
          {rows.map((r) => (
            <li key={r.questionNo} className={`rounded-surface border-l-4 bg-surface p-4 text-ink ${r.correct ? "border-success" : "border-error"}`}>
              <p className="flex items-center gap-2 font-semibold">
                {r.correct ? <Check aria-hidden size={18} className="text-success" /> : <X aria-hidden size={18} className="text-error" />}
                {r.correct ? s("correct") : s("missed")}
                <span className="font-normal text-ink-muted">· {s("questionN", { n: r.questionNo })}</span>
              </p>
              <p className="mt-2">{r.question}</p>
              <p className="mt-1"><span className="text-ink-muted">{s("yourAnswer")}</span> {r.given}</p>
              {!r.correct && (
                <>
                  <p className="mt-1"><span className="text-ink-muted">{s("correctAnswer")}</span> {r.correctAnswer}</p>
                  <Link to="/learn/ai/hint" className="mt-1 inline-flex min-h-11 items-center text-ink underline" aria-label={s("hintFor", { n: r.questionNo })}>
                    {s("hint")}
                  </Link>
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="next-steps" className="space-y-4">
        <h2 id="next-steps" className="font-heading text-[22px] text-ink">{s("nextSteps")}</h2>
        {missed && <LoopStepper current={1} />}
        {!missed && <p className="text-ink">{s("allRight")}</p>}
        <div className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
          <Link to="/active-quizzes" className="btn-primary">{s("retryMissed")}</Link>
          <Link to="/learn/gap" className="btn-secondary">{s("fullPlan")}</Link>
          <Link to="/learn/coach" className="btn-secondary">{s("coach")}</Link>
        </div>
      </section>

      <section aria-labelledby="receipt" className="rounded-surface border border-border bg-surface p-4">
        <h2 id="receipt" className="font-heading text-[20px] text-ink">{s("receipt")}</h2>
        <p className="mt-2 text-ink">{t(`shared.moodleStatus.${attempt.moodleStatus}`)}</p>
        <button type="button" className="btn-secondary mt-3" onClick={() => {
          const receipt = `${quizTitle(attempt.quizId)}\n${s("score", { n: score })}\n${rows.map((r) => `Question ${r.questionNo}: ${r.correct ? "Correct" : "Missed"} — ${r.correct ? r.given : `Correct answer: ${r.correctAnswer}`}`).join("\n")}`;
          downloadBlob(new Blob([receipt], { type: "text/plain;charset=utf-8" }), `edvidura-receipt-${attempt.id}.txt`);
        }}>{s("download")}</button>
      </section>
    </div>
  );
}
