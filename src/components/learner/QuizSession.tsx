import { Bookmark, Check, X } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { SessionExpired } from "@/components/shared/SessionExpired";
import { QuizModeBadge } from "@/components/shared/QuizModeBadge";
import { checkpointQuiz, type OptionKey } from "@/data/quiz";
import { mockState } from "@/data/mockState";

const s = (k: string, v?: Record<string, string | number>) => t(`LR-05.${k}`, v);

/** LR-05: every question on one page, one form. No Next/Previous. */
export function QuizSession() {
  const quiz = checkpointQuiz;
  const m = mockState.quiz;
  const questions = m.sessionScreen === "empty" ? [] : quiz.questions;
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [struck, setStruck] = useState<Record<string, OptionKey[]>>({});
  const [bookmarked, setBookmarked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [expired, setExpired] = useState(false);
  const groups = useRef<Record<string, HTMLFieldSetElement | null>>({});

  const n = Object.keys(answers).length;
  const progress = questions.length ? Math.round((n / questions.length) * 100) : 0;
  const unanswered = questions.length - n;
  const firstOpen = questions.find((q) => !answers[q.id]);

  const submit = () => {
    setConfirm(false); setSubmitting(true); setError(false);
    setTimeout(() => {
      setSubmitting(false);
      if (m.submit === "error") setError(true);
      else if (m.submit === "sessionExpired") setExpired(true);
      else navigate({ to: "/quiz/result/$attemptId", params: { attemptId: m.submittedAttemptId } });
    }, m.submit === "slow" ? 5000 : m.submittingMs);
  };

  if (expired) return <SessionExpired />;

  const body = s("confirmBody") + (unanswered > 0 ? " " + (unanswered === 1 ? s("unansweredOne") : s("unansweredMany", { n: unanswered })) : "");

  return (
    <form onSubmit={(e) => { e.preventDefault(); setConfirm(true); }} className="mx-auto w-full max-w-content px-4">
      <div className="sticky top-24 z-10 -mx-4 border-b border-border bg-page-bg px-4 py-3 tablet:top-14">
        <div className="grid grid-cols-1 items-center gap-2 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:gap-3">
          <div className="min-w-0"><PageHeading text={quiz.title} /></div>
          <div className="min-w-0 text-left tablet:shrink-0 tablet:text-right">
            <p aria-live="polite" className="font-semibold text-ink">{s("answered", { n })}</p>
            {firstOpen && (
              <a href={`#q-${firstOpen.id}`} className="inline-flex min-h-11 items-center text-sm text-ink underline"
                onClick={(e) => { e.preventDefault(); const g = groups.current[firstOpen.id]; g?.scrollIntoView({ block: "center" }); g?.focus(); }}>
                {s("firstUnanswered")}
              </a>
            )}
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-label={s("answered", { n })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full bg-secondary transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <p className="mt-4 max-w-reading text-ink"><QuizModeBadge kind={m.sessionType} /></p>

      {m.sessionScreen === "loading" ? <div className="mt-6 pb-40"><LoadingSkeleton count={3} /></div> : m.sessionScreen === "error" ? <div className="mt-6 pb-40"><ErrorAlert message={s("error")} /></div> : questions.length === 0 ? <div className="mt-6 pb-40"><EmptyState title={s("noQuestions")} help="" /></div> : <ol className="mt-6 space-y-6 pb-40">
        {questions.map((q, i) => (
          <li key={q.id}>
            <fieldset id={`q-${q.id}`} ref={(el) => { groups.current[q.id] = el; }} tabIndex={-1} disabled={submitting}
              className="scroll-mt-32 rounded-surface border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-white font-bold">{i + 1}</span>
                <p className="text-sm text-ink-muted">{s("questionOf", { n: i + 1 })}</p>
                <button type="button" aria-pressed={bookmarked.includes(q.id)} aria-label={s("bookmarkQuestion", { n: i + 1 })}
                  onClick={() => setBookmarked((items) => items.includes(q.id) ? items.filter((id) => id !== q.id) : [...items, q.id])}
                  className={`inline-flex size-11 items-center justify-center rounded-full border ${bookmarked.includes(q.id) ? "border-secondary bg-primary-fixed text-secondary" : "border-border-control"}`}>
                  <Bookmark aria-hidden size={18} fill={bookmarked.includes(q.id) ? "currentColor" : "none"} />
                </button>
              </div>
              <legend className="sr-only">{q.text}</legend>
              <p aria-hidden className="mt-2 font-semibold text-ink">{q.text}</p>
              <div role="radiogroup" aria-label={q.text} className="mt-3 space-y-2">
                {q.options.map((o) => {
                  const on = answers[q.id] === o.key;
                  const crossed = struck[q.id]?.includes(o.key) ?? false;
                  return (
                    <div key={o.key} className={`flex min-h-14 flex-wrap items-center gap-2 rounded-surface border-2 px-3 py-2 text-ink transition-colors duration-150 ${on ? "border-secondary bg-primary-fixed" : "border-border-control bg-surface"}`}>
                      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input type="radio" name={q.id} value={o.key} checked={on} className="size-5 shrink-0 accent-secondary"
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))} />
                        <span className="font-semibold" aria-hidden>{o.key}.</span>
                        <span className={`min-w-0 flex-1 ${crossed ? "line-through opacity-60" : ""}`}>{o.text}</span>
                        {on && <Check aria-hidden size={20} className="shrink-0 text-secondary" />}
                      </label>
                      <button type="button" aria-pressed={crossed} aria-label={s("strikeOut", { key: o.key })}
                        onClick={() => setStruck((all) => ({ ...all, [q.id]: crossed ? (all[q.id] ?? []).filter((key) => key !== o.key) : [...(all[q.id] ?? []), o.key] }))}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-control" title={s("strikeOut", { key: o.key })}>
                        <X aria-hidden size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-content space-y-2">
          {error && <ErrorAlert message={s("error")} />}
          <button type="submit" disabled={submitting || m.sessionScreen !== "ready"} className="btn-primary w-full tablet:w-auto">{submitting ? s("submitting") : s("submit")}</button>
          <SlowNetworkNote pending={submitting} />
        </div>
      </div>

      <ConfirmDialog open={confirm} title={s("confirmTitle")} body={body} confirmLabel={s("confirmYes")} cancelLabel={s("confirmNo")}
        onConfirm={submit} onCancel={() => setConfirm(false)} />
    </form>
  );
}
