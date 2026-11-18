import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Brain,
  HelpCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import { getLocaleBcp47, t, useLocale } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { EmptyState } from "@/components/shared/EmptyState";
import { CoachStarterChips } from "@/components/shared/CoachStarterChips";
import {
  VoiceInputButton,
  VoiceListenButton,
} from "@/components/shared/VoiceControls";
import { coachExchanges, type CoachExchange } from "@/data/coach";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";

// LR-07 Ask Vidura with Jane Street Socratic Tutor & Indian Multilingual Voice
export const Route = createFileRoute("/_shell/learn/coach")({
  head: () => ({
    meta: [
      { title: t("pages.coach") + t("app.titleSuffix") },
      { name: "description", content: t("LR-07.line1") },
      { property: "og:title", content: t("pages.coach") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-07.line1") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`LR-07.${k}`);

interface SocraticTracker {
  skill: string;
  skill_name: string;
  mastery_level: number;
  max_level: number;
  level_description: string;
  leveled_up: boolean;
  diagnostic_question: string;
  hint: string;
  all_skills?: Array<{ id: string; name: string; level: number; max: number }>;
}

interface Turn {
  id: number;
  question: string;
  reply?: CoachExchange;
  socratic?: SocraticTracker;
  failed?: boolean;
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z ]/g, "");
function pickReply(q: string, count: number): CoachExchange | undefined {
  const n = norm(q);
  return (
    coachExchanges.find(
      (e) => norm(e.question) === n || n.includes(norm(e.question).split(" ").slice(-2).join(" ")),
    ) ?? coachExchanges[count % coachExchanges.length]
  );
}

function Page() {
  const m = mockState.coach;
  const { locale, bcp47 } = useLocale();
  const [tutorMode, setTutorMode] = useState<"socratic" | "direct">("socratic");
  const [skills, setSkills] = useState<Record<string, number>>({
    variables: 2,
    "solve-linear": 2,
    "word-problems": 1,
  });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const send = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const q = (customQuestion || text).trim();
    if (!q || busy) return;
    const id = turns.length;
    setTurns((ts) => [...ts, { id, question: q }]);
    setText("");
    setBusy(true);

    try {
      const resp = await api.post<{
        answer?: string;
        text?: string;
        reply?: string;
        citations?: Array<{ title?: string; id?: string }>;
        sources?: string[];
        checkYourself?: string;
        check_question?: string;
        socratic?: SocraticTracker;
      }>("/api/v1/app/coach", {
        question: q,
        reply_language: bcp47,
        mode: tutorMode,
        current_level: skills["solve-linear"] || 1,
      });

      const answerText = resp.answer || resp.text || resp.reply;
      if (answerText) {
        const sourcesList =
          resp.sources ||
          (resp.citations
            ? resp.citations.map((c) => c.title || c.id || "Class Manual Reference")
            : ["Class 8 RHS-C08 Manual"]);

        if (resp.socratic?.all_skills) {
          const updated: Record<string, number> = {};
          for (const item of resp.socratic.all_skills) {
            updated[item.id] = item.level;
          }
          setSkills((prev) => ({ ...prev, ...updated }));
        }

        setTurns((ts) =>
          ts.map((x) =>
            x.id !== id
              ? x
              : {
                  ...x,
                  socratic: resp.socratic,
                  reply: {
                    id: `resp-${id}`,
                    question: q,
                    answer: answerText,
                    checkYourself:
                      resp.socratic?.diagnostic_question ||
                      resp.check_question ||
                      resp.checkYourself ||
                      "Verify your reasoning with the chapter worked example.",
                    sources: sourcesList,
                  },
                },
          ),
        );
        setBusy(false);
        return;
      }
    } catch (err) {
      console.warn("Backend coach API unavailable, using fallback:", err);
    }

    const reply = pickReply(q, id);
    setTurns((ts) =>
      ts.map((x) =>
        x.id !== id
          ? x
          : m.reply === "error" || !reply
            ? { ...x, failed: true }
            : { ...x, reply },
      ),
    );
    setBusy(false);
  };

  const stop = () => {
    clearTimeout(timer.current);
    setBusy(false);
    setTurns((ts) => ts.filter((x) => x.reply || x.failed));
  };

  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 tablet:grid tablet:grid-cols-[minmax(0,1fr)_460px] tablet:gap-8">
      <div className="space-y-6">
        <div>
          <PageHeading titleKey="pages.coach" />
          <div className="max-w-reading space-y-1 text-ink mt-1">
            <p>{s("line1")}</p>
            <p className="text-sm text-ink-muted">{s("line2")}</p>
          </div>
        </div>

        {/* Jane Street Socratic Tutor Mode Selector */}
        <div className="rounded-surface border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="text-brand size-5" />
              <span className="font-heading font-semibold text-ink text-sm">
                Tutor Mode
              </span>
            </div>
            <span className="rounded-pill bg-brand/10 text-brand px-2.5 py-0.5 text-xs font-medium">
              Socratic Guided Learning
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTutorMode("socratic")}
              className={`rounded-card border p-2.5 text-left transition-all ${
                tutorMode === "socratic"
                  ? "border-brand bg-brand/5 ring-1 ring-brand text-ink"
                  : "border-border bg-page-bg text-ink-muted hover:text-ink"
              }`}
            >
              <div className="font-semibold text-xs text-brand">Socratic Guided Mode</div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                Probing questions, one step at a time, targeted hints.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTutorMode("direct")}
              className={`rounded-card border p-2.5 text-left transition-all ${
                tutorMode === "direct"
                  ? "border-brand bg-brand/5 ring-1 ring-brand text-ink"
                  : "border-border bg-page-bg text-ink-muted hover:text-ink"
              }`}
            >
              <div className="font-semibold text-xs">Direct Reference Mode</div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                Immediate factual explanations and direct manual excerpts.
              </div>
            </button>
          </div>

          {/* Socratic Mastery Level Tracker (0 to 5) */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-ink mb-2">
              <span className="flex items-center gap-1.5">
                <Award className="size-4 text-amber-500" />
                Socratic Mastery Tracker (Levels 0–5)
              </span>
              <span className="text-ink-muted text-[11px]">Class 8 RHS-C08</span>
            </div>
            <div className="space-y-2">
              {[
                { id: "variables", label: "Variables & Expressions", level: skills["variables"] || 2 },
                { id: "solve-linear", label: "Solving Linear Equations", level: skills["solve-linear"] || 2 },
                { id: "word-problems", label: "Linear Word Problems", level: skills["word-problems"] || 1 },
              ].map((sk) => (
                <div key={sk.id} className="text-xs">
                  <div className="flex justify-between text-ink-muted text-[11px] mb-1">
                    <span className="font-medium text-ink">{sk.label}</span>
                    <span className="font-mono">
                      Level {sk.level} / 5
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all duration-300"
                      style={{ width: `${(sk.level / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <nav
          aria-label={s("quick")}
          className="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap"
        >
          <Link to="/learn/gap" className="btn-secondary text-xs">
            {s("plan")}
          </Link>
          <Link to="/active-quizzes" className="btn-secondary text-xs">
            {s("quiz")}
          </Link>
          <Link to="/learn/flashcards" className="btn-secondary text-xs">
            {s("flashcards")}
          </Link>
          <Link to="/manuals" className="btn-secondary text-xs inline-flex items-center gap-1">
            <BookOpen size={14} />
            eBooks & Manuals
          </Link>
        </nav>
      </div>

      <section
        aria-label={s("conversation")}
        className="mt-6 flex min-h-[65vh] flex-col rounded-surface border border-border bg-surface tablet:mt-0 shadow-sm"
      >
        {!m.lessonsLinked ? (
          <div className="p-4">
            <EmptyState title={s("empty")} help={s("emptyHelp")} />
          </div>
        ) : (
          <>
            <ol className="flex-1 space-y-4 overflow-y-auto p-4 max-h-[60vh]">
              {turns.length === 0 && (
                <div className="rounded-card border border-dashed border-border p-6 text-center text-ink-muted text-sm">
                  <Brain className="mx-auto size-8 text-brand/60 mb-2" />
                  <p className="font-semibold text-ink">Ask Vidura — AI Study Coach</p>
                  <p className="text-xs mt-1">
                    Ask questions about your Class 8 lessons or use voice dictation in your preferred Indian language.
                  </p>
                </div>
              )}
              {turns.map((x) => (
                <li key={x.id} className="space-y-3">
                  <div className="ml-auto max-w-[85%] rounded-surface bg-highlight p-3 text-ink shadow-2xs">
                    <p className="text-xs font-semibold text-ink-muted mb-0.5">{s("yourQuestion")}</p>
                    <p className="text-sm">{x.question}</p>
                  </div>
                  {x.failed && <ErrorAlert message={s("error")} />}
                  {x.reply && (
                    <Reply
                      ex={x.reply}
                      socratic={x.socratic}
                      noSources={m.reply === "noSources"}
                      onAskFollowUp={(followUp) => send(undefined, followUp)}
                    />
                  )}
                </li>
              ))}
            </ol>
            <p role="status" className="px-4 text-xs text-ink-muted">
              {busy ? s("thinking") : ""}
            </p>
            <form
              onSubmit={(e) => send(e)}
              className="sticky bottom-0 space-y-2 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center justify-between gap-2">
                <CoachStarterChips
                  onSelect={(prompt) => {
                    setText(prompt);
                    input.current?.focus();
                  }}
                />
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
                    input.current?.focus();
                  }}
                  lang={bcp47}
                />
              </div>

              <label htmlFor="coach-q" className="sr-only">
                {s("yourQuestion")}
              </label>
              <textarea
                ref={input}
                id="coach-q"
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask Vidura a concept question, or click Voice..."
                className="w-full rounded-surface border border-border bg-surface p-2.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button type="submit" disabled={busy || !text.trim()} className="btn-primary text-xs py-1.5">
                    {s("send")}
                  </button>
                  {busy && (
                    <button type="button" onClick={stop} className="btn-secondary text-xs py-1.5">
                      {s("stop")}
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-ink-muted font-medium">
                  {tutorMode === "socratic" ? "Socratic Guided Mode" : "Direct Mode"}
                </span>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function Reply({
  ex,
  socratic,
  noSources,
  onAskFollowUp,
}: {
  ex: CoachExchange;
  socratic?: SocraticTracker;
  noSources: boolean;
  onAskFollowUp?: (q: string) => void;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const { bcp47 } = useLocale();

  return (
    <div className="max-w-[94%] rounded-surface border border-border bg-page-bg p-3.5 text-ink space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
          <Sparkles size={14} />
          {s("coach")}
        </div>
        <VoiceListenButton text={`${ex.answer}. ${ex.checkYourself}`} lang={bcp47} />
      </div>

      {noSources ? (
        <p className="text-sm">{s("notFound")}</p>
      ) : (
        <>
          <p className="text-sm leading-relaxed">{ex.answer}</p>

          {/* Socratic Guiding Check Card */}
          {ex.checkYourself && (
            <div className="rounded-surface bg-highlight p-3 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-1">
                <HelpCircle size={14} className="text-brand" />
                <span>{socratic ? "Socratic Check Question" : s("checkYourself")}</span>
              </div>
              <p className="text-xs text-ink">{ex.checkYourself}</p>
              {socratic?.hint && (
                <p className="text-[11px] text-ink-muted italic mt-1.5">
                  💡 Hint: {socratic.hint}
                </p>
              )}
              {onAskFollowUp && (
                <button
                  type="button"
                  onClick={() => onAskFollowUp(`How do I answer: "${ex.checkYourself}"?`)}
                  className="mt-2 text-[11px] font-semibold text-brand hover:underline inline-flex items-center gap-1"
                >
                  Work through this step →
                </button>
              )}
            </div>
          )}

          {/* Socratic Progression Badge */}
          {socratic?.leveled_up && (
            <div className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 border border-emerald-300 px-3 py-1 text-xs text-emerald-800">
              <Award size={14} className="text-emerald-600" />
              <span>
                Level Up! Advanced to <strong>Level {socratic.mastery_level}</strong> in {socratic.skill_name}
              </span>
            </div>
          )}

          <ul aria-label={t("shared.ai.sourcesLearner")} className="flex flex-wrap gap-1.5 pt-1">
            {ex.sources.map((source) => (
              <li
                key={source}
                className="rounded-full border border-secondary/30 bg-primary-fixed px-2.5 py-0.5 text-xs text-secondary font-medium"
              >
                {source}
              </li>
            ))}
          </ul>
        </>
      )}

      <AITrustNote audience="learner" sources={[]} />

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
        <span className="text-xs text-ink-muted">{s("helpful")}</span>
        {(["up", "down"] as const).map((v) => {
          const Icon = v === "up" ? ThumbsUp : ThumbsDown;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={vote === v}
              aria-label={s(v === "up" ? "yes" : "no")}
              onClick={() => setVote(vote === v ? null : v)}
              className={`inline-flex size-8 items-center justify-center rounded-surface border ${
                vote === v ? "border-brand bg-highlight text-brand" : "border-border bg-surface text-ink-muted"
              }`}
            >
              <Icon aria-hidden size={14} />
            </button>
          );
        })}
        <span role="status" className="text-xs text-ink-muted">
          {vote ? s("thanks") : ""}
        </span>
      </div>
    </div>
  );
}
