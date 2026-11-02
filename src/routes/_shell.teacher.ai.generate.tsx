import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { EmptyState } from "@/components/shared/EmptyState";
import { ItemChecklist } from "@/components/teacher/ItemChecklist";
import { DraftBadge } from "@/components/teacher/DraftBadge";
import { draftQuestions } from "@/data/aiDrafts";
import { mockState } from "@/data/mockState";

// TC-07 AI generation preview. No publish, no "accept all", no editing here.
export const Route = createFileRoute("/_shell/teacher/ai/generate")({
  head: () => ({
    meta: [
      { title: t("TC-07.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-07.lead") },
      { property: "og:title", content: t("TC-07.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-07.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-07.${k}`, v);
const letters = ["A", "B", "C", "D"];

function Page() {
  const m = mockState.teacher.generate;
  const qs = draftQuestions.questions;
  const [picked, setPicked] = useState<boolean[]>(qs.map(() => true));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<null | "saved" | "error">(null);
  const [savedQuestions, setSavedQuestions] = useState<number[]>([]);
  const [discarded, setDiscarded] = useState(false);
  const count = picked.filter(Boolean).length;

  const save = () => {
    setSaving(true); setResult(null);
    setTimeout(() => {
      setSaving(false);
      if (m.save === "error") setResult("error");
      else {
        setSavedQuestions((current) => [...new Set([...current, ...picked.flatMap((selected, index) => selected ? [index] : [])])]);
        setResult("saved");
      }
    }, m.savingMs);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-28 pt-8 tablet:pb-8">
      <div>
        <div className="flex items-center justify-between gap-2">
          <PageHeading text={s("title")} />
          {m.state === "loaded" && !discarded && savedQuestions.length < qs.length && <DraftBadge />}
        </div>
        <p className="mt-2 text-ink">{m.source === "file" ? s("fromFile", { name: m.fileName }) : s("fromPrompt")}</p>
      </div>

      {m.state === "unreadable" ? <ErrorAlert message={s("unreadable")} /> : m.state === "none" || discarded ? (
        <EmptyState title={s("none")} help="" action={<Link to="/teacher/ai" className="btn-secondary">{s("tryAgain")}</Link>} />
      ) : (
        <div className="studio-grid">
          <ol className="space-y-4">
            {qs.map((q, i) => (
              <li key={i} className="rounded-surface border border-border bg-surface p-4">
                <label className="flex min-h-11 items-center gap-2 font-semibold text-ink">
                  <input type="checkbox" checked={picked[i]} onChange={(e) => setPicked(picked.map((v, j) => (j === i ? e.target.checked : v)))}
                    className="size-5 accent-accent" aria-label={`${s("save")}: ${s("question", { n: i + 1 })}`} />
                  {s("save")}
                </label>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-ink">{s("question", { n: i + 1 })}: {q.text}</h2>
                  {!savedQuestions.includes(i) && <DraftBadge />}
                </div>
                <ul className="mt-2 space-y-1">
                  {q.options.map((o, j) => (
                    <li key={j} className={`flex items-start gap-2 rounded-surface p-2 text-ink ${j === q.correctIndex ? "border border-success" : ""}`}>
                      <span className="font-semibold">{letters[j]}.</span>
                      <span className="min-w-0 flex-1">{o}</span>
                      {j === q.correctIndex && <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-success"><CheckCircle2 aria-hidden size={16} />{s("correct")}</span>}
                    </li>
                  ))}
                </ul>
                <AITrustNote audience="instructor" sources={draftQuestions.sources} />
              </li>
            ))}
          </ol>
          <div className="order-first space-y-4 desktop:order-none"><ItemChecklist ns="TC-07" /></div>
        </div>
      )}

      {result === "error" && <ErrorAlert message={s("saveError")} />}
      {result === "saved" && <StatusBanner variant="success">{s("saved")}</StatusBanner>}

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap gap-2 border-t border-border bg-surface p-3 tablet:static tablet:border-0 tablet:bg-transparent tablet:p-0">
        {m.state === "loaded" && !discarded && (
          <button type="button" className="btn-primary flex-1 tablet:flex-none" onClick={save} disabled={saving || count === 0}>{saving ? s("saving") : s("saveSelected")}</button>
        )}
        {m.state === "loaded" && !discarded && (
          <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => { setDiscarded(true); setResult(null); }}>{t("shared.discard")}</button>
        )}
        <Link to="/teacher/ai" className="btn-secondary flex-1 tablet:flex-none">{s("back")}</Link>
        <Link to="/teacher/content" className="btn-secondary flex-1 tablet:flex-none">{s("cancel")}</Link>
      </div>
    </div>
  );
}
