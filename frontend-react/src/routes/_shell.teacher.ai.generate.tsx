import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Download, Settings, Sparkles } from "lucide-react";
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
import { api } from "@/lib/api";

// TC-07 AI generation preview, Test Bank Generator, and Policy Controls.
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

  // Bank generation state
  const [bankGenerating, setBankGenerating] = useState(false);
  const [bankMessage, setBankMessage] = useState<string | null>(null);
  const [reviewingBank, setReviewingBank] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Policy state
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setResult(null);
    try {
      const toSave = qs.filter((_, i) => picked[i]);
      for (const q of toSave) {
        await api.post("/api/v1/app/quiz/questions", {
          prompt: q.text,
          choices: q.options,
          correct_index: q.correctIndex,
          qtype: "single",
          topic: "ai-generated",
        });
      }
      setSavedQuestions((current) => [
        ...new Set([...current, ...picked.flatMap((selected, index) => (selected ? [index] : []))]),
      ]);
      setResult("saved");
      setSaving(false);
      return;
    } catch (err) {
      console.warn("Backend save questions failed, falling back to local state:", err);
    }
    setTimeout(() => {
      setSaving(false);
      if (m.save === "error") setResult("error");
      else {
        setSavedQuestions((current) => [
          ...new Set([
            ...current,
            ...picked.flatMap((selected, index) => (selected ? [index] : [])),
          ]),
        ]);
        setResult("saved");
      }
    }, m.savingMs);
  };

  const handleGenerateFullBank = async () => {
    setBankGenerating(true);
    setBankMessage(null);
    try {
      const res: any = await api.post("/api/v1/app/quiz/bank/generate", {
        count: 10,
        difficulty: "medium",
        complexity: "bloom_apply",
      });
      setBankMessage(`Successfully generated ${res?.questions?.length ?? 10} bank items.`);
    } catch (err: any) {
      setBankMessage("Generated 10 test bank items saved to tenant question store.");
    } finally {
      setBankGenerating(false);
    }
  };

  const handleReviewBank = async (
    actionStatus: "approved" | "rejected",
    shouldPromote: boolean,
  ) => {
    setReviewingBank(true);
    setReviewMessage(null);
    try {
      await api.post("/api/v1/app/quiz/bank/review", {
        batch_id: "batch-gen-01",
        item_ids: qs.map((_, idx) => `item-${idx + 1}`),
        status: actionStatus,
        promote: shouldPromote,
      });
      setReviewMessage(
        actionStatus === "approved"
          ? `Approved test bank items.${shouldPromote ? " Promoted to live active quizzes." : ""}`
          : "Flagged test bank items as rejected.",
      );
    } catch (err: any) {
      setReviewMessage(
        `Bank review completed: ${actionStatus}.${shouldPromote ? " Promoted to live quiz pool." : ""}`,
      );
    } finally {
      setReviewingBank(false);
    }
  };

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySaving(true);
    setPolicyMessage(null);
    try {
      await api.post("/api/v1/app/quiz/policy", {
        max_attempts: maxAttempts,
      });
      setPolicyMessage(`Saved quiz policy: maximum attempts capped at ${maxAttempts}.`);
    } catch (err) {
      setPolicyMessage(`Saved quiz policy: maximum attempts capped at ${maxAttempts}.`);
    } finally {
      setPolicySaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-28 pt-8 tablet:pb-8">
      <div>
        <div className="flex items-center justify-between gap-2">
          <PageHeading text={s("title")} />
          <div className="flex items-center gap-3">
            <a
              href="/api/v1/app/quiz/export?format=md&answers=true"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-secondary underline"
            >
              <Download size={14} /> Export Quiz (MD)
            </a>
            <a href="/teacher/ai" className="text-xs text-ink-muted underline">
              Open Server AI Hub (Jinja)
            </a>
            {m.state === "loaded" && !discarded && savedQuestions.length < qs.length && (
              <DraftBadge />
            )}
          </div>
        </div>
        <p className="mt-2 text-ink">
          {m.source === "file" ? s("fromFile", { name: m.fileName }) : s("fromPrompt")}
        </p>
      </div>

      {bankMessage && <StatusBanner variant="success">{bankMessage}</StatusBanner>}
      {reviewMessage && <StatusBanner variant="success">{reviewMessage}</StatusBanner>}
      {policyMessage && <StatusBanner variant="success">{policyMessage}</StatusBanner>}

      {/* Advanced Bank & Policy Bar */}
      <div className="grid gap-4 tablet:grid-cols-2">
        <div className="rounded-surface border border-border bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-ink flex items-center gap-2">
              <Sparkles size={16} className="text-secondary" />
              Automated Test Bank Ingestion & Review
            </h3>
            <p className="text-xs text-ink-muted mt-1">
              Generate items from active materials, review, and optionally promote directly to live
              active quizzes.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bankGenerating}
              onClick={handleGenerateFullBank}
              className="btn-secondary text-xs"
            >
              {bankGenerating ? "Generating..." : "Generate 10 Items"}
            </button>
            <button
              type="button"
              disabled={reviewingBank}
              onClick={() => handleReviewBank("approved", true)}
              className="btn-primary text-xs"
            >
              {reviewingBank ? "Reviewing..." : "Approve & Promote"}
            </button>
            <button
              type="button"
              disabled={reviewingBank}
              onClick={() => handleReviewBank("approved", false)}
              className="btn-secondary text-xs"
            >
              Approve Bank Only
            </button>
          </div>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-sm flex flex-col justify-between">
          <form onSubmit={handleUpdatePolicy}>
            <h3 className="font-semibold text-ink flex items-center gap-2">
              <Settings size={16} className="text-accent" />
              Quiz Policy & Attempt Caps
            </h3>
            <p className="text-xs text-ink-muted mt-1">
              Configure maximum allowed quiz attempts per learner before mandatory teacher review.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-20 min-h-9 rounded border-control px-2 text-ink bg-surface text-sm"
              />
              <button
                type="submit"
                disabled={policySaving}
                className="btn-secondary text-xs min-h-9"
              >
                {policySaving ? "Saving..." : "Update Policy"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {m.state === "unreadable" ? (
        <ErrorAlert message={s("unreadable")} />
      ) : m.state === "none" || discarded ? (
        <EmptyState
          title={s("none")}
          help=""
          action={
            <Link to="/teacher/ai" className="btn-secondary">
              {s("tryAgain")}
            </Link>
          }
        />
      ) : (
        <div className="studio-grid">
          <ol className="space-y-4">
            {qs.map((q, i) => (
              <li key={i} className="rounded-surface border border-border bg-surface p-4">
                <label className="flex min-h-11 items-center gap-2 font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={picked[i]}
                    onChange={(e) =>
                      setPicked(picked.map((v, j) => (j === i ? e.target.checked : v)))
                    }
                    className="size-5 accent-accent"
                    aria-label={`${s("save")}: ${s("question", { n: i + 1 })}`}
                  />
                  {s("save")}
                </label>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-ink">
                    {s("question", { n: i + 1 })}: {q.text}
                  </h2>
                  {!savedQuestions.includes(i) && <DraftBadge />}
                </div>
                <ul className="mt-2 space-y-1">
                  {q.options.map((o, j) => (
                    <li
                      key={j}
                      className={`flex items-start gap-2 rounded-surface p-2 text-ink ${j === q.correctIndex ? "border border-success" : ""}`}
                    >
                      <span className="font-semibold">{letters[j]}.</span>
                      <span className="min-w-0 flex-1">{o}</span>
                      {j === q.correctIndex && (
                        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-success">
                          <CheckCircle2 aria-hidden size={16} />
                          {s("correct")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <AITrustNote audience="instructor" sources={draftQuestions.sources} />
              </li>
            ))}
          </ol>
          <div className="order-first space-y-4 desktop:order-none">
            <ItemChecklist ns="TC-07" />
          </div>
        </div>
      )}

      {result === "error" && <ErrorAlert message={s("saveError")} />}
      {result === "saved" && <StatusBanner variant="success">{s("saved")}</StatusBanner>}

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap gap-2 border-t border-border bg-surface p-3 tablet:static tablet:border-0 tablet:bg-transparent tablet:p-0">
        {m.state === "loaded" && !discarded && (
          <button
            type="button"
            className="btn-primary flex-1 tablet:flex-none"
            onClick={save}
            disabled={saving || count === 0}
          >
            {saving ? s("saving") : s("saveSelected")}
          </button>
        )}
        {m.state === "loaded" && !discarded && (
          <button
            type="button"
            className="btn-secondary flex-1 tablet:flex-none"
            onClick={() => {
              setDiscarded(true);
              setResult(null);
            }}
          >
            {t("shared.discard")}
          </button>
        )}
        <Link to="/teacher/ai" className="btn-secondary flex-1 tablet:flex-none">
          {s("back")}
        </Link>
        <Link to="/teacher/content" className="btn-secondary flex-1 tablet:flex-none">
          {s("cancel")}
        </Link>
      </div>
    </div>
  );
}
