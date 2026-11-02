import { useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { DraftBadge } from "@/components/teacher/DraftBadge";
import { gradeAssist as g } from "@/data/aiDrafts";
import { mockState } from "@/data/mockState";

// TC-11 Grade assist. No score, no mark, nothing sent to Moodle, no learner names.
export const Route = createFileRoute("/_shell/teacher/ai/grade-assist")({
  head: () => ({
    meta: [
      { title: t("TC-11.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-11.lead") },
      { property: "og:title", content: t("TC-11.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-11.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-11.${k}`);
const card = "rounded-surface border border-border bg-surface p-4";
const h2 = "font-heading text-[18px] text-ink";

function Page() {
  const id = useId();
  const m = mockState.teacher.gradeAssist;
  const [phase, setPhase] = useState<"idle" | "generating" | "generated" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = () => {
    setPhase("generating"); setCopied(false);
    setTimeout(() => {
      if (m.draft === "error") { setPhase("error"); return; }
      setFeedback(g.feedback); setPhase("generated");
    }, m.draftingMs);
  };
  const copy = async () => {
    try { await navigator.clipboard?.writeText(feedback); } catch { /* blocked; still confirm in prototype */ }
    setCopied(true);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-28 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      <div className="grid gap-6 tablet:grid-cols-2">
        <div className="space-y-4">
          <section aria-labelledby={`${id}-i`} className={card}>
            <h2 id={`${id}-i`} className={h2}>{s("inputs")}</h2>
            <dl className="mt-2 space-y-2 text-ink">
              <div><dt className="font-semibold">{s("question")}</dt><dd>{g.question}</dd></div>
              <div><dt className="font-semibold">{s("answer")}</dt><dd>{g.answer}</dd></div>
            </dl>
          </section>
          <section aria-labelledby={`${id}-r`} className={card}>
            <h2 id={`${id}-r`} className={h2}>{s("rubric")}</h2>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-ink">{g.rubric.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>
          <button type="button" className="btn-secondary" onClick={generate} disabled={phase === "generating"}>{s("generate")}</button>
          <p role="status" className="text-ink">{phase === "generating" ? s("generating") : ""}</p>
        </div>
        <div className="space-y-4">
          {phase === "error" && <ErrorAlert message={s("error")} onRetry={generate} />}
          {phase === "generated" && (
            <div className={`${card} space-y-4`}>
              {!saved && <div className="flex justify-end"><DraftBadge /></div>}
              <section aria-labelledby={`${id}-s`}>
                <h2 id={`${id}-s`} className={h2}>{s("strengths")}</h2>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-ink">{g.strengths.map((x) => <li key={x}>{x}</li>)}</ul>
              </section>
              <section aria-labelledby={`${id}-m`}>
                <h2 id={`${id}-m`} className={h2}>{s("improvements")}</h2>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-ink">{g.improvements.map((x) => <li key={x}>{x}</li>)}</ul>
              </section>
              <div>
                <label htmlFor={`${id}-f`} className={`block ${h2}`}>{s("feedback")}</label>
                <p id={`${id}-n`} className="text-sm text-ink-muted">{s("note")}</p>
                <textarea id={`${id}-f`} rows={6} value={feedback} aria-describedby={`${id}-n`}
                  onChange={(e) => { setFeedback(e.target.value); setCopied(false); }}
                  className="mt-2 w-full rounded-surface bg-surface px-3 py-2 text-ink border-control" />
              </div>
              <AITrustNote audience="instructor" sources={g.sources} />
            </div>
          )}
        </div>
      </div>
      {saved && phase === "generated" && <StatusBanner variant="success">{s("saved")}</StatusBanner>}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface p-3 tablet:static tablet:border-0 tablet:bg-transparent tablet:p-0">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary flex-1 tablet:flex-none" onClick={copy} disabled={phase !== "generated" || !feedback.trim()}>{s("copy")}</button>
          {phase === "generated" && (
            <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => { setSaved(true); setCopied(false); }}>{s("save")}</button>
          )}
          {phase === "generated" && (
            <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => { setPhase("idle"); setFeedback(""); setCopied(false); setSaved(false); }}>{t("shared.discard")}</button>
          )}
          <Link to="/teacher/ai" className="btn-secondary flex-1 tablet:flex-none">{s("back")}</Link>
        </div>
        <p role="status" className="mt-2 text-sm text-success empty:hidden">{copied ? s("copied") : ""}</p>
      </div>
    </div>
  );
}
