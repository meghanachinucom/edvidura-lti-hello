import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
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
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [expired, setExpired] = useState(false);
  const groups = useRef<Record<string, HTMLFieldSetElement | null>>({});

  const n = Object.keys(answers).length;
  const unanswered = quiz.questions.length - n;
  const firstOpen = quiz.questions.find((q) => !answers[q.id]);

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
      <div className="sticky top-0 z-10 -mx-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-page-bg px-4 py-3">
        <div className="min-w-0"><PageHeading text={quiz.title} /></div>
        <div className="shrink-0 text-right">
          <p aria-live="polite" className="font-semibold text-ink">{s("answered", { n })}</p>
          {firstOpen && (
            <a href={`#q-${firstOpen.id}`} className="inline-flex min-h-11 items-center text-sm text-ink underline"
              onClick={(e) => { e.preventDefault(); const g = groups.current[firstOpen.id]; g?.scrollIntoView({ block: "center" }); g?.focus(); }}>
              {s("firstUnanswered")}
            </a>
          )}
        </div>
      </div>
      <p className="mt-4 max-w-reading text-ink"><QuizModeBadge kind={m.sessionType} /></p>

      <ol className="mt-6 space-y-6 pb-40">
        {quiz.questions.map((q, i) => (
          <li key={q.id}>
            <fieldset id={`q-${q.id}`} ref={(el) => { groups.current[q.id] = el; }} tabIndex={-1} disabled={submitting}
              className="scroll-mt-32 rounded-surface border border-border bg-surface p-4">
              <p className="text-sm text-ink-muted">{s("questionOf", { n: i + 1 })}</p>
              <legend className="sr-only">{q.text}</legend>
              <p aria-hidden className="mt-1 font-semibold text-ink">{q.text}</p>
              <div role="radiogroup" aria-label={q.text} className="mt-3 space-y-2">
                {q.options.map((o) => {
                  const on = answers[q.id] === o.key;
                  return (
                    <label key={o.key} className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-surface border-2 px-3 py-2 text-ink transition-[border-color,background-color] duration-150 ${on ? "border-accent bg-primary-fixed" : "border-border-control bg-surface"}`}>
                      <input type="radio" name={q.id} value={o.key} checked={on} className="size-5 shrink-0 accent-accent"
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))} />
                      <span className="font-semibold" aria-hidden>{o.key}.</span>
                      <span className="min-w-0 flex-1">{o.text}</span>
                      {on && <Check aria-hidden size={20} className="shrink-0 text-accent" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-content space-y-2">
          {error && <ErrorAlert message={s("error")} />}
          <button type="submit" disabled={submitting} className="btn-primary w-full tablet:w-auto">{submitting ? s("submitting") : s("submit")}</button>
          <SlowNetworkNote pending={submitting} />
        </div>
      </div>

      <ConfirmDialog open={confirm} title={s("confirmTitle")} body={body} confirmLabel={s("confirmYes")} cancelLabel={s("confirmNo")}
        onConfirm={submit} onCancel={() => setConfirm(false)} />
    </form>
  );
}
