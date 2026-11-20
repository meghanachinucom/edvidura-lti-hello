import { Bookmark, Check, X, Clock, HelpCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { checkpointQuiz, type OptionKey, type Quiz } from "@/data/quiz";
import { recordAttemptAnswers, type AnswerRow } from "@/data/attemptAnswers";
import { mockState } from "@/data/mockState";
import { api, ApiError } from "@/lib/api";
import { adaptQuiz, type BackendQuizSummary } from "@/lib/adapters";
import { ExamIntegrityMonitor } from "@/components/enterprise/ExamIntegrityMonitor";

const s = (k: string, v?: Record<string, string | number>) => t(`LR-05.${k}`, v);

interface QuizSubmitDetailItem {
  prompt?: string;
  chosen?: string;
  correct?: boolean;
}

interface QuizSubmitResponse {
  attempt_id: string;
  score: number;
  max_score: number;
  pass_percent: number;
  passed: boolean;
  practice: boolean;
  grade_sent?: boolean;
  grade_queued?: boolean;
  ags_available?: boolean;
  detail?: Record<string, QuizSubmitDetailItem>;
}

export interface QuizSessionProps {
  practice?: boolean;
}

/** LR-05: every question on one page, one form. No Next/Previous. */
export function QuizSession({ practice: propPractice }: QuizSessionProps = {}) {
  const m = mockState.quiz;
  const navigate = useNavigate();
  const [isPractice, setIsPractice] = useState(Boolean(propPractice));

  useEffect(() => {
    if (propPractice !== undefined) {
      setIsPractice(propPractice);
    } else if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("practice") === "1" || sp.get("practice") === "true") {
        setIsPractice(true);
      }
    }
  }, [propPractice]);

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz>(checkpointQuiz);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [struck, setStruck] = useState<Record<string, OptionKey[]>>({});
  const [bookmarked, setBookmarked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [hintsOpen, setHintsOpen] = useState<Record<string, boolean>>({});
  const groups = useRef<Record<string, HTMLFieldSetElement | null>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  useEffect(() => {
    let active = true;
    async function loadQuiz() {
      setLoading(true);
      setError(null);
      try {
        const endpoint = isPractice ? "/api/v1/app/quiz?practice=1" : "/api/v1/app/quiz";
        const resp = await api.get<BackendQuizSummary>(endpoint);
        if (active && resp && resp.questions && resp.questions.length > 0) {
          setQuiz(
            adaptQuiz({
              id: resp.id || "qz-active",
              title: resp.title || checkpointQuiz.title,
              questions: resp.questions,
            }),
          );
          setLoading(false);
          return;
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.statusCode === 401) {
          if (active) setExpired(true);
          return;
        }
        console.warn("Live quiz questions fetch fallback:", err);
      }

      // Prototype fallback
      if (active) {
        setQuiz(checkpointQuiz);
        setLoading(false);
      }
    }
    loadQuiz();
    return () => {
      active = false;
    };
  }, [isPractice]);

  const questions = m.sessionScreen === "empty" ? [] : quiz.questions;
  const n = Object.keys(answers).length;
  const progress = questions.length ? Math.round((n / questions.length) * 100) : 0;
  const unanswered = questions.length - n;
  const firstOpen = questions.find((q) => !answers[q.id]);

  const submit = async () => {
    setConfirm(false);
    setSubmitting(true);
    setError(null);

    try {
      const resp = await api.post<QuizSubmitResponse>("/api/v1/app/quiz/submit", {
        answers,
        practice: isPractice,
      });

      if (resp && resp.attempt_id) {
        // Record question breakdown rows for result screen
        const rows: AnswerRow[] = Object.entries(resp.detail || {}).map(([, info], idx) => ({
          questionNo: idx + 1,
          question: info.prompt || questions[idx]?.text || `Question ${idx + 1}`,
          given: String(info.chosen || answers[questions[idx]?.id ?? ""] || "Unanswered"),
          correctAnswer: info.correct ? String(info.chosen || "Selected") : "See Lesson Review",
          correct: Boolean(info.correct),
        }));
        recordAttemptAnswers(resp.attempt_id, rows);

        navigate({
          to: "/quiz/result/$attemptId",
          params: { attemptId: resp.attempt_id },
        });
        return;
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setExpired(true);
        setSubmitting(false);
        return;
      }
      console.warn("Quiz submit API error:", err);
      if (m.submit === "error") {
        setError(s("error"));
      } else {
        setError(err instanceof Error ? err.message : s("error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (expired) return <SessionExpired />;

  const body =
    s("confirmBody") +
    (unanswered > 0
      ? " " + (unanswered === 1 ? s("unansweredOne") : s("unansweredMany", { n: unanswered }))
      : "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setConfirm(true);
      }}
      className="mx-auto w-full max-w-content px-4"
    >
      <div className="sticky top-24 z-10 -mx-4 border-b border-border bg-page-bg px-4 py-3 tablet:top-14">
        <div className="grid grid-cols-1 items-center gap-2 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-3">
            <PageHeading text={quiz.title} />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
              <Clock className="size-3.5 text-secondary" />
              <span>Session Timer: {formatTime(secondsElapsed)}</span>
            </div>
          </div>
          <div className="min-w-0 text-left tablet:shrink-0 tablet:text-right">
            <p aria-live="polite" className="font-semibold text-ink">
              {s("answered", { n, total: questions.length })}
            </p>
            {firstOpen && (
              <a
                href={`#q-${firstOpen.id}`}
                className="inline-flex min-h-11 items-center text-sm text-ink underline"
                onClick={(e) => {
                  e.preventDefault();
                  const g = groups.current[firstOpen.id];
                  g?.scrollIntoView({ block: "center" });
                  g?.focus();
                }}
              >
                {s("firstUnanswered")}
              </a>
            )}
          </div>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label={s("answered", { n, total: questions.length })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full bg-secondary transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <ExamIntegrityMonitor />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-reading text-ink">
          <QuizModeBadge kind={m.sessionType} />
        </p>
        <p className="rounded-surface border border-border bg-surface px-4 py-3 font-semibold text-ink">
          {s("passMark")}
        </p>
      </div>

      {m.sessionScreen === "loading" ? (
        <div className="mt-6 pb-40">
          <LoadingSkeleton count={3} />
        </div>
      ) : m.sessionScreen === "error" ? (
        <div className="mt-6 pb-40">
          <ErrorAlert message={s("error")} />
        </div>
      ) : questions.length === 0 ? (
        <div className="mt-6 pb-40">
          <EmptyState title={s("noQuestions")} help="" />
        </div>
      ) : (
        <ol className="mt-6 space-y-6 pb-40">
          {questions.map((q, i) => (
            <li key={q.id}>
              <fieldset
                id={`q-${q.id}`}
                ref={(el) => {
                  groups.current[q.id] = el;
                }}
                tabIndex={-1}
                disabled={submitting}
                className="scroll-mt-32 rounded-surface border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 items-center justify-center rounded-full bg-secondary text-white font-bold text-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-ink-muted">
                        {s("questionOf", { n: i + 1, total: questions.length })}
                      </p>
                      {q.topic && (
                        <span className="inline-block text-xs font-bold text-secondary">
                          {q.topic}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {q.difficulty && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${
                          q.difficulty === "Advanced"
                            ? "bg-purple-100 text-purple-800"
                            : q.difficulty === "Foundational"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    )}
                    <span className="rounded-control bg-surface-elevated px-2 py-1 text-xs font-bold text-ink border border-border">
                      {q.points ? `${q.points} pt` : s("oneMark")}
                    </span>
                    <button
                      type="button"
                      aria-pressed={bookmarked.includes(q.id)}
                      aria-label={s("bookmarkQuestion", { n: i + 1 })}
                      onClick={() =>
                        setBookmarked((items) =>
                          items.includes(q.id)
                            ? items.filter((id) => id !== q.id)
                            : [...items, q.id],
                        )
                      }
                      className={`inline-flex size-9 items-center justify-center rounded-control border ${
                        bookmarked.includes(q.id)
                          ? "border-secondary bg-primary-fixed text-secondary"
                          : "border-border-control text-ink-muted hover:text-ink"
                      }`}
                    >
                      <Bookmark
                        aria-hidden
                        size={16}
                        fill={bookmarked.includes(q.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </div>

                <legend className="sr-only">{q.text}</legend>
                <p
                  aria-hidden
                  className="text-base font-heading font-bold text-ink leading-relaxed"
                >
                  {q.text}
                </p>

                {q.hint && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setHintsOpen((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                    >
                      <Sparkles className="size-3.5" />
                      <span>{hintsOpen[q.id] ? "Hide Hint" : "Need a Hint?"}</span>
                    </button>
                    {hintsOpen[q.id] && (
                      <div className="mt-2 rounded-control border border-secondary/20 bg-primary-fixed/40 p-3 text-xs text-ink leading-relaxed">
                        <strong className="text-secondary font-bold">Hint: </strong>
                        {q.hint}
                      </div>
                    )}
                  </div>
                )}

                <div role="radiogroup" aria-label={q.text} className="mt-3 space-y-2.5">
                  {q.options.map((o) => {
                    const on = answers[q.id] === o.key;
                    const crossed = struck[q.id]?.includes(o.key) ?? false;
                    const inputId = `opt-${q.id}-${o.key}`;
                    return (
                      <div
                        key={o.key}
                        onClick={() => {
                          if (!submitting) {
                            setAnswers((a) => ({ ...a, [q.id]: o.key }));
                            setSaved(false);
                          }
                        }}
                        className={`group flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-surface border-2 px-3.5 py-2.5 text-ink transition-all duration-150 ${
                          on
                            ? "border-secondary bg-primary-fixed ring-2 ring-secondary/30 shadow-xs"
                            : "border-border-control bg-surface hover:border-secondary/40 hover:bg-surface-elevated"
                        }`}
                      >
                        <label
                          htmlFor={inputId}
                          onClick={(e) => e.stopPropagation()}
                          className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 select-none"
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name={q.id}
                            value={o.key}
                            checked={on}
                            className="size-5 shrink-0 accent-secondary cursor-pointer"
                            onChange={() => {
                              setAnswers((a) => ({ ...a, [q.id]: o.key }));
                              setSaved(false);
                            }}
                          />
                          <span
                            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                              on
                                ? "bg-secondary text-white"
                                : "bg-surface-elevated text-ink border border-border"
                            }`}
                            aria-hidden
                          >
                            {o.key}
                          </span>
                          <span
                            className={`min-w-0 flex-1 text-sm font-medium leading-normal ${
                              crossed ? "line-through opacity-50 text-ink-muted" : "text-ink"
                            }`}
                          >
                            {o.text}
                          </span>
                          {on && (
                            <Check
                              aria-hidden
                              size={18}
                              className="shrink-0 text-secondary stroke-[2.5]"
                            />
                          )}
                        </label>
                        <button
                          type="button"
                          aria-pressed={crossed}
                          aria-label={s("strikeOut", { key: o.key })}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStruck((all) => ({
                              ...all,
                              [q.id]: crossed
                                ? (all[q.id] ?? []).filter((key) => key !== o.key)
                                : [...(all[q.id] ?? []), o.key],
                            }));
                          }}
                          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition ${
                            crossed
                              ? "border-border bg-surface-elevated text-ink-muted"
                              : "border-border-control text-ink-muted hover:border-secondary/50 hover:text-ink"
                          }`}
                          title={s("strikeOut", { key: o.key })}
                        >
                          <X aria-hidden size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-content space-y-2">
          {error && <ErrorAlert message={typeof error === "string" ? error : s("error")} />}
          {saved && (
            <p role="status" className="text-sm text-ink-muted">
              {s("saved")}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting || m.sessionScreen !== "ready"}
              onClick={() => setSaved(true)}
              className="btn-secondary flex-1"
            >
              {s("save")}
            </button>
            <button
              type="submit"
              disabled={submitting || m.sessionScreen !== "ready"}
              className="btn-primary flex-1"
            >
              {submitting ? s("submitting") : s("submit")}
            </button>
          </div>
          <SlowNetworkNote pending={submitting} />
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title={s("confirmTitle")}
        body={body}
        confirmLabel={s("confirmYes")}
        cancelLabel={s("confirmNo")}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
    </form>
  );
}
