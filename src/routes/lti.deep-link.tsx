import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { SessionExpired } from "@/components/shared/SessionExpired";
import { deepLinkOptions } from "@/data/institute";
import { mockState, isSessionExpired } from "@/data/mockState";

// SH-05 Deep link picker. Minimal header (wordmark only), no full nav, so it sits outside the shell.
export const Route = createFileRoute("/lti/deep-link")({
  head: () => ({
    meta: [
      { title: t("SH-05.title") + t("app.titleSuffix") },
      { name: "description", content: t("SH-05.lead") },
      { property: "og:title", content: t("SH-05.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SH-05.lead") },
    ],
  }),
  component: DeepLink,
});

const s = (k: string) => t(`SH-05.${k}`);
type Phase = "idle" | "submitting" | "error" | "done";

function DeepLink() {
  const [choice, setChoice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  if (isSessionExpired("/lti/deep-link")) return <main id="main"><SessionExpired /></main>;
  const options = mockState.deepLink.list === "populated" ? deepLinkOptions : [];

  const add = () => {
    setPhase("submitting");
    setTimeout(() => setPhase(mockState.deepLink.submit === "error" ? "error" : "done"), mockState.deepLink.submittingMs);
  };

  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <a href="#main" className="skip-link">{t("app.skip")}</a>
      <header className="border-b border-border bg-surface px-4 py-3">
        <p className="mx-auto max-w-content font-heading text-[22px] font-bold text-ink">{t("app.name")}</p>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <PageHeading text={s("title")} />
        <p className="mt-2 text-ink-muted">{s("lead")}</p>

        {options.length === 0 ? (
          <div className="mt-6"><EmptyState title={s("empty")} help="" /></div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (choice) add(); }}>
            <fieldset>
              <legend className="sr-only">{s("optionsLabel")}</legend>
              <ul className="space-y-2">
                {options.map((o) => (
                  <li key={o}>
                    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-surface border bg-surface p-4 ${choice === o ? "border-accent" : "border-border"}`}>
                      <input type="radio" name="deep-link" value={o} checked={choice === o} onChange={() => { setChoice(o); if (phase !== "submitting") setPhase("idle"); }}
                        aria-describedby={o === "quiz" ? "dl-quiz-help" : undefined} className="mt-1 size-5 shrink-0 accent-accent" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{s(`options.${o}`)}</span>
                        <span className="block text-sm text-ink-muted">{s(`types.${o}`)}</span>
                        {o === "quiz" && <span id="dl-quiz-help" className="mt-1 block text-sm text-ink">{s("quizHelp")}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            {phase === "error" && <ErrorAlert message={s("error")} onRetry={add} />}
            {phase === "done" && <StatusBanner variant="success">{s("added")}</StatusBanner>}
            <button type="submit" disabled={!choice || phase === "submitting"} className="btn-primary disabled:opacity-60">
              {phase === "submitting" ? s("adding") : s("add")}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
