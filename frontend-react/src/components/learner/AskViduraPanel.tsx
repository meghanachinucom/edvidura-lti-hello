import { useEffect, useRef, useState, type FormEvent } from "react";
import { Award, Brain, MessageCircle, Sparkles, X } from "lucide-react";
import { getLocaleBcp47, t, useLocale, type Locale } from "@/i18n";
import { useFocusTrap } from "@/components/shared/useFocusTrap";
import { CoachStarterChips } from "@/components/shared/CoachStarterChips";
import { CitationChip } from "@/components/shared/CitationChip";
import { CheckQuestionCard } from "@/components/shared/CheckQuestionCard";
import { VoiceInputButton, VoiceListenButton } from "@/components/shared/VoiceControls";
import {
  askViduraLanguages,
  pickViduraAnswer,
  VIDURA_OFF_SCOPE,
  type ViduraAnswer,
} from "@/data/askVidura";
import { api } from "@/lib/api";

// M2 Ask Vidura side panel. Learner role only with Jane Street Socratic scaffolding.
const s = (k: string) => t(`M2.${k}`);

interface Turn {
  id: number;
  question: string;
  answer?: ViduraAnswer | null | undefined;
  socraticHint?: string | undefined;
  masteryLevel?: number | undefined;
}

export function AskViduraPanel() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);

  const open = () => {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };
  const close = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), 200);
  };

  return (
    <>
      <button
        ref={openBtn}
        type="button"
        onClick={open}
        aria-expanded={mounted}
        className="btn-primary fixed bottom-4 right-4 z-40 shadow-md flex items-center gap-2"
      >
        <MessageCircle aria-hidden size={18} />
        {s("button")}
      </button>
      {mounted && <Panel visible={visible} onClose={close} />}
    </>
  );
}

function Panel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose);
  const { locale, setLocale, bcp47 } = useLocale();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"socratic" | "direct">("socratic");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const send = async (e?: FormEvent, customQ?: string) => {
    if (e) e.preventDefault();
    const q = (customQ || text).trim();
    if (!q || busy) return;
    const id = turns.length;
    setTurns((ts) => [...ts, { id, question: q }]);
    setText("");
    setBusy(true);

    try {
      const res = await api.post<{
        answer?: string;
        citations?: Array<{ title?: string; id?: string }>;
        check_question?: string;
        socratic?: {
          hint?: string;
          mastery_level?: number;
          diagnostic_question?: string;
        };
      }>("/api/v1/app/coach", {
        question: q,
        reply_language: bcp47,
        mode,
      });

      if (res?.answer) {
        setBusy(false);
        const viduraAns: ViduraAnswer = {
          key: `ans-${id}`,
          answer: res.answer,
          check:
            res.socratic?.diagnostic_question ||
            res.check_question ||
            "Review the lesson worked example.",
          citations: [
            {
              lesson: res.citations?.[0]?.title || "Algebra I Chapter 1",
              section: res.citations?.[0]?.id || "Section 1",
            },
            {
              lesson: res.citations?.[1]?.title || "Linear Equations Lesson",
              section: res.citations?.[1]?.id || "Section 2",
            },
          ],
        };
        setTurns((ts) =>
          ts.map((x) =>
            x.id === id
              ? {
                  ...x,
                  answer: viduraAns,
                  socraticHint: res.socratic?.hint,
                  masteryLevel: res.socratic?.mastery_level,
                }
              : x,
          ),
        );
        return;
      }
    } catch {
      // fallback
    }

    timer.current = setTimeout(() => {
      setBusy(false);
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, answer: pickViduraAnswer(q) } : x)));
    }, 1000);
  };

  const stop = () => {
    clearTimeout(timer.current);
    setBusy(false);
    setTurns((ts) => ts.filter((x) => x.answer !== undefined));
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={s("button")}
      className={`fixed inset-0 z-50 flex flex-col bg-surface transition-transform ease-out tablet:inset-y-0 tablet:left-auto tablet:right-0 tablet:w-[440px] tablet:border-l tablet:border-border ${
        visible ? "translate-x-0 duration-[250ms]" : "translate-x-full duration-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-ink">{s("button")}</h2>
            <span className="rounded-pill bg-brand/10 text-brand px-2 py-0.5 text-xs font-semibold">
              Guided Tutor
            </span>
          </div>
          <p className="text-xs text-ink-muted">{s("scope")}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={s("close")} className="icon-btn">
          <X aria-hidden size={20} />
        </button>
      </div>

      <div className="border-b border-border p-3 bg-page-bg/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-ink">Mode:</span>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "socratic" ? "direct" : "socratic"))}
            className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold border ${
              mode === "socratic"
                ? "bg-brand text-white border-brand"
                : "bg-surface text-ink-muted border-border"
            }`}
          >
            {mode === "socratic" ? "Guided Inquiry" : "Direct Reference"}
          </button>
        </div>
        <span className="text-xs text-ink-muted font-mono">{bcp47}</span>
      </div>

      <ol className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded-surface border border-dashed border-border p-6 text-center text-xs text-ink-muted">
            <Brain className="mx-auto size-7 text-brand/60 mb-2" />
            <p className="font-semibold text-ink">Ask Vidura — Class 8 Study Coach</p>
            <p className="mt-1">
              Ask anything about your lessons or use the Voice button to speak in your language.
            </p>
          </div>
        )}
        {turns.map((x) => (
          <li key={x.id} className="space-y-3">
            <div className="ml-auto max-w-[85%] rounded-surface bg-highlight p-3 text-ink">
              <p className="text-xs font-semibold text-ink-muted">{s("yourQuestion")}</p>
              <p className="text-sm">{x.question}</p>
            </div>
            {x.answer !== undefined && (
              <Answer
                answer={x.answer}
                socraticHint={x.socraticHint}
                masteryLevel={x.masteryLevel}
                bcp47={bcp47}
                onStep={() => send(undefined, `Guide me on: ${x.answer?.check}`)}
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
        className="space-y-2 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-2">
          <CoachStarterChips
            onSelect={(prompt) => {
              setText(prompt);
              ref.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
            }}
          />
          <VoiceInputButton
            onTranscript={(trans) => {
              setText((prev) => (prev ? `${prev} ${trans}` : trans));
              ref.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
            }}
            lang={bcp47}
          />
        </div>

        <label htmlFor="vidura-q" className="sr-only">
          {s("yourQuestion")}
        </label>
        <textarea
          id="vidura-q"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question or click Voice..."
          className="w-full rounded-surface border border-border bg-surface p-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="btn-primary text-xs py-1.5"
          >
            {s("send")}
          </button>
          {busy && (
            <button type="button" onClick={stop} className="btn-secondary text-xs py-1.5">
              {s("stop")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Answer({
  answer,
  socraticHint,
  masteryLevel,
  bcp47,
  onStep,
}: {
  answer: ViduraAnswer | null;
  socraticHint?: string | undefined;
  masteryLevel?: number | undefined;
  bcp47: string;
  onStep?: (() => void) | undefined;
}) {
  const [vote, setVote] = useState<"helpful" | "notHelpful" | null>(null);
  return (
    <div className="max-w-[94%] space-y-3 rounded-surface border border-border bg-page-bg p-3.5 text-ink text-sm shadow-2xs">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-brand flex items-center gap-1.5">
          <Sparkles size={14} />
          {s("coach")}
        </p>
        {answer && <VoiceListenButton text={`${answer.answer}. ${answer.check}`} lang={bcp47} />}
      </div>

      {answer === null ? (
        <p className="text-xs text-ink-muted">{VIDURA_OFF_SCOPE}</p>
      ) : (
        <>
          <p className="leading-relaxed">{answer.answer}</p>
          <div>
            <p className="text-xs font-semibold text-ink-muted mb-1">{s("citations")}</p>
            <div className="flex flex-wrap gap-1 text-xs">
              <CitationChip {...answer.citations[0]} />
              <CitationChip {...answer.citations[1]} />
            </div>
          </div>

          <div className="rounded-surface bg-highlight p-2.5 border border-border/60">
            <CheckQuestionCard label="Concept Self-Check" question={answer.check} />
            {socraticHint && (
              <p className="text-xs text-ink-muted italic mt-1">💡 Hint: {socraticHint}</p>
            )}
            {onStep && (
              <button
                type="button"
                onClick={onStep}
                className="mt-1.5 text-xs font-semibold text-brand hover:underline block"
              >
                Work through this step →
              </button>
            )}
          </div>

          {masteryLevel && (
            <div className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-pill border border-emerald-300">
              <Award size={12} className="text-emerald-600" />
              <span>Skill Mastery: Level {masteryLevel} / 5</span>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
        {vote === null ? (
          <>
            <button
              type="button"
              onClick={() => setVote("helpful")}
              className="text-xs text-ink-muted hover:text-ink"
            >
              👍 {s("helpful")}
            </button>
            <button
              type="button"
              onClick={() => setVote("notHelpful")}
              className="text-xs text-ink-muted hover:text-ink"
            >
              👎 {s("notHelpful")}
            </button>
          </>
        ) : (
          <p role="status" className="text-xs text-ink-muted">
            {s("thanks")}
          </p>
        )}
      </div>
    </div>
  );
}
