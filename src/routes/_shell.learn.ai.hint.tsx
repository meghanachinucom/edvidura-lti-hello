import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { checkpointQuiz } from "@/data/quiz";
import { mockState } from "@/data/mockState";

// LR-08 AI hint. Never reveals the correct answer.
export const Route = createFileRoute("/_shell/learn/ai/hint")({
  head: () => ({
    meta: [
      { title: t("pages.hint") + t("app.titleSuffix") },
      { name: "description", content: t("LR-08.tryThis") },
      { property: "og:title", content: t("pages.hint") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-08.tryThis") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`LR-08.${k}`);

function Page() {
  const m = mockState.hint;
  const question = checkpointQuiz.questions[0]!;
  const [phase, setPhase] = useState<"idle" | "loading" | "shown" | "error">("idle");
  const unavailable = m.state === "unavailable";
  const get = () => {
    setPhase("loading");
    setTimeout(() => setPhase(m.state === "error" ? "error" : "shown"), m.loadingMs);
  };
  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <Link to="/quiz/result/$attemptId" params={{ attemptId: mockState.quiz.submittedAttemptId }} className="inline-flex min-h-11 items-center text-ink underline">{s("back")}</Link>
      <PageHeading titleKey="pages.hint" />
      <section aria-labelledby="hint-q" className="max-w-reading rounded-surface border border-border bg-surface p-4 text-ink">
        <h2 id="hint-q" className="font-heading text-[20px]">{s("question")}</h2>
        <p className="mt-2">{question.text}</p>
      </section>
      <div className="space-y-2">
        <button type="button" onClick={get} disabled={unavailable || phase === "loading"} className="btn-primary">
          {phase === "loading" ? s("loading") : s("get")}
        </button>
        {unavailable && <p className="text-ink-muted">{s("unavailable")}</p>}
      </div>
      <div role="status" aria-live="polite">
        {phase === "shown" && (
          <section aria-labelledby="hint-t" className="max-w-reading rounded-surface border-l-4 border-focus-ring bg-surface p-4 text-ink">
            <h2 id="hint-t" className="font-heading text-[20px]">{s("tryThis")}</h2>
            <p className="mt-2">{s("hint")}</p>
            <AITrustNote audience="learner" />
          </section>
        )}
      </div>
      {phase === "error" && <ErrorAlert message={s("error")} onRetry={get} />}
    </div>
  );
}
