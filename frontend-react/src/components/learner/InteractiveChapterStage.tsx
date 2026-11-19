import { useEffect, useState, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { getLocaleBcp47, useLocale } from "@/i18n";
import { api } from "@/lib/api";

export interface BeatInlineCheck {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface ChapterBeat {
  id: string;
  beat_index: number;
  title: string;
  narration_text: string;
  narration_translations?: Record<string, string>;
  visual_diagram?: {
    type: string;
    [key: string]: any;
  };
  duration_sec: number;
  inline_check?: BeatInlineCheck;
}

interface InteractiveChapterStageProps {
  manualId: string;
  chapterIndex: number;
  chapterTitle: string;
  onClose?: () => void;
}

export function InteractiveChapterStage({
  manualId,
  chapterIndex,
  chapterTitle,
  onClose,
}: InteractiveChapterStageProps) {
  const { locale, bcp47 } = useLocale();
  const [beats, setBeats] = useState<ChapterBeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBeatIdx, setCurrentBeatIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<{ ok?: boolean; beats?: ChapterBeat[] }>(
        `/api/v1/app/manuals/${manualId}/beats?chapter_index=${chapterIndex}&lang=${locale}`,
      )
      .then((res) => {
        if (active && res && res.beats && res.beats.length > 0) {
          setBeats(res.beats);
          setCurrentBeatIdx(0);
          setLoading(false);
        } else {
          // Fallback beats for offline / prototype
          setBeats([
            {
              id: "beat-fallback-1",
              beat_index: 0,
              title: "The Equal Sign as a Balanced Scale",
              narration_text:
                "An equation states that two mathematical expressions represent the exact same quantity. Picture a balanced physical scale: whatever you do to one side, you must do to the other to keep it balanced.",
              visual_diagram: {
                type: "balance_scale",
                left: "2x + 5",
                right: "15",
              },
              duration_sec: 30,
              inline_check: {
                id: "check-fb-1",
                question: "Why must an operation be applied to both sides of an equation?",
                options: [
                  "To change the variable",
                  "To preserve balance and equality",
                  "To eliminate all numbers",
                  "To double the answer",
                ],
                correct_index: 1,
                explanation:
                  "Applying operations equally to both sides ensures the mathematical statement remains true.",
              },
            },
            {
              id: "beat-fallback-2",
              beat_index: 1,
              title: "Undoing Constant Addition",
              narration_text:
                "In 2x + 5 = 15, our first objective is to isolate the variable term 2x. Because 5 is added, we use the inverse operation: subtract 5 from both sides, yielding 2x = 10.",
              visual_diagram: {
                type: "step_transformation",
                initial: "2x + 5 = 15",
                action: "- 5 from both sides",
                result: "2x = 10",
              },
              duration_sec: 35,
              inline_check: {
                id: "check-fb-2",
                question: "What is the inverse operation of adding 5?",
                options: ["Adding 5", "Subtracting 5", "Multiplying by 5", "Dividing by 5"],
                correct_index: 1,
                explanation: "Subtraction is the inverse operation of addition.",
              },
            },
          ]);
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });

    return () => {
      active = false;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [manualId, chapterIndex, locale]);

  const currentBeat = beats[currentBeatIdx];

  // Stop TTS when beat changes
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setSelectedOption(null);
    setFeedback(null);
    setIsCorrect(null);
  }, [currentBeatIdx]);

  const togglePlayAudio = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!currentBeat) return;
    window.speechSynthesis.cancel();

    // Language-aware narration
    const textToRead =
      (currentBeat.narration_translations && currentBeat.narration_translations[locale]) ||
      currentBeat.narration_text;

    const utter = new SpeechSynthesisUtterance(textToRead);
    utter.rate = speed;
    utter.lang = bcp47;
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);

    speechRef.current = utter;
    window.speechSynthesis.speak(utter);
    setIsPlaying(true);
  };

  const handleOptionSelect = async (optIdx: number) => {
    setSelectedOption(optIdx);
    if (!currentBeat || !currentBeat.inline_check) return;

    try {
      const res = await api.post<{
        ok?: boolean;
        is_correct?: boolean;
        feedback?: string;
        explanation?: string;
      }>(`/api/v1/app/manuals/${manualId}/beats/${currentBeat.id}/check`, {
        selected_option: optIdx,
        subject: "6",
      });
      if (res) {
        setIsCorrect(Boolean(res.is_correct));
        setFeedback(res.feedback || res.explanation || currentBeat.inline_check.explanation);
      }
    } catch {
      const isRight = optIdx === currentBeat.inline_check.correct_index;
      setIsCorrect(isRight);
      setFeedback(
        isRight
          ? `✓ Correct! ${currentBeat.inline_check.explanation}`
          : `Review: ${currentBeat.inline_check.explanation}`,
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-surface border border-border bg-surface p-8 text-center text-sm text-ink-muted">
        Loading interactive chapter beats...
      </div>
    );
  }

  if (!currentBeat) {
    return (
      <div className="rounded-surface border border-border bg-surface p-8 text-center text-sm text-ink-muted">
        No interactive beats available for this chapter yet.
      </div>
    );
  }

  return (
    <div className="rounded-surface border-2 border-brand/30 bg-surface p-5 shadow-sm space-y-5">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand/10 text-brand px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
              Interactive Storyboard Beat {currentBeatIdx + 1} / {beats.length}
            </span>
            <span className="text-xs text-ink-muted font-medium">{chapterTitle}</span>
          </div>
          <h3 className="font-heading text-lg font-bold text-ink mt-1">{currentBeat.title}</h3>
        </div>

        {/* Speed & Close */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-muted font-medium">Speed:</label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded border border-border bg-page-bg px-2 py-1 text-xs font-semibold text-ink"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
          </select>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-ink-muted hover:text-ink font-semibold ml-2"
            >
              Back to Book
            </button>
          )}
        </div>
      </div>

      {/* Visual Diagram Stage */}
      <div className="rounded-card border border-border bg-page-bg p-6 text-center min-h-[160px] flex flex-col items-center justify-center relative overflow-hidden">
        {currentBeat.visual_diagram?.type === "balance_scale" && (
          <div className="space-y-4 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center text-sm font-bold text-ink px-8">
              <span className="bg-brand/10 text-brand border border-brand/30 rounded-surface px-4 py-2 shadow-xs">
                {currentBeat.visual_diagram["left"]}
              </span>
              <span className="text-2xl font-bold text-amber-500">=</span>
              <span className="bg-brand/10 text-brand border border-brand/30 rounded-surface px-4 py-2 shadow-xs">
                {currentBeat.visual_diagram["right"]}
              </span>
            </div>
            <div className="h-1 bg-border w-3/4 mx-auto relative rounded-full">
              <div className="size-3 bg-brand rounded-full absolute left-1/2 -top-1 -translate-x-1/2" />
            </div>
            <p className="text-[11px] text-ink-muted">
              Balanced scale: apply equal operations to both sides
            </p>
          </div>
        )}

        {currentBeat.visual_diagram?.type === "step_transformation" && (
          <div className="space-y-3 w-full max-w-md mx-auto">
            <div className="text-xs font-mono text-ink-muted line-through">
              {currentBeat.visual_diagram["initial"]}
            </div>
            <div className="text-xs font-bold text-brand bg-brand/10 border border-brand/30 px-3 py-1 rounded inline-block">
              {currentBeat.visual_diagram["action"]}
            </div>
            <div className="text-sm font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-surface shadow-xs">
              {currentBeat.visual_diagram["result"]}
            </div>
          </div>
        )}

        {currentBeat.visual_diagram?.type !== "balance_scale" &&
          currentBeat.visual_diagram?.type !== "step_transformation" && (
            <div className="space-y-2">
              <Sparkles className="size-8 text-brand mx-auto opacity-70" />
              <p className="text-sm font-bold text-ink">{currentBeat.title}</p>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                {currentBeat.narration_text.slice(0, 120)}...
              </p>
            </div>
          )}
      </div>

      {/* Narration Player & Subtitles */}
      <div className="rounded-card border border-border/80 bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayAudio}
              className={`inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-bold text-white transition ${
                isPlaying ? "bg-red-600 animate-pulse" : "bg-brand hover:bg-brand/90"
              }`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? "Pause Narration" : "Play Narration"}</span>
            </button>
            <span className="text-[11px] text-ink-muted">
              {currentBeat.duration_sec}s concept segment
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-ink-muted">
            <Volume2 size={14} />
            <span>Voice Language: {bcp47}</span>
          </div>
        </div>

        {/* Live Subtitles */}
        <div className="rounded bg-page-bg p-3 border border-border/60 text-xs text-ink leading-relaxed">
          <p className="font-semibold text-ink-muted text-[11px] mb-0.5">Captions:</p>
          <p>
            {(currentBeat.narration_translations && currentBeat.narration_translations[locale]) ||
              currentBeat.narration_text}
          </p>
        </div>
      </div>

      {/* Inline Checkpoint Question */}
      {currentBeat.inline_check && (
        <div className="rounded-card border-2 border-brand/40 bg-brand/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand uppercase tracking-wider inline-flex items-center gap-1">
              <HelpCircle size={14} />
              Concept Checkpoint
            </span>
            <span className="text-[10px] text-ink-muted font-mono">
              Auto-graded with xAPI progress
            </span>
          </div>
          <p className="text-xs font-bold text-ink">{currentBeat.inline_check.question}</p>

          <div className="space-y-1.5">
            {currentBeat.inline_check.options.map((opt, oIdx) => {
              const isSelected = selectedOption === oIdx;
              const isOptionCorrect = oIdx === currentBeat.inline_check?.correct_index;
              const btnClass =
                feedback !== null && isSelected
                  ? isOptionCorrect
                    ? "border-emerald-500 bg-emerald-100 text-emerald-900 font-bold"
                    : "border-red-500 bg-red-100 text-red-900"
                  : feedback !== null && isOptionCorrect
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold"
                    : "border-border bg-surface text-ink hover:border-brand";

              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleOptionSelect(oIdx)}
                  className={`w-full text-left rounded border px-3 py-2 text-xs transition flex items-center justify-between ${btnClass}`}
                >
                  <span>
                    {String.fromCharCode(65 + oIdx)}. {opt}
                  </span>
                  {feedback !== null && isOptionCorrect && (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`rounded p-2.5 text-xs border ${
                isCorrect
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              {feedback}
            </div>
          )}
        </div>
      )}

      {/* Stepper Controls */}
      <div className="flex justify-between items-center border-t border-border/70 pt-3">
        <button
          type="button"
          onClick={() => setCurrentBeatIdx((i) => Math.max(0, i - 1))}
          disabled={currentBeatIdx === 0}
          className="btn-secondary text-xs gap-1 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          <span>Previous Beat</span>
        </button>

        <span className="text-xs font-semibold text-ink-muted">
          Beat {currentBeatIdx + 1} of {beats.length}
        </span>

        <button
          type="button"
          onClick={() => setCurrentBeatIdx((i) => Math.min(beats.length - 1, i + 1))}
          disabled={currentBeatIdx >= beats.length - 1}
          className="btn-primary text-xs gap-1 disabled:opacity-40"
        >
          <span>Next Beat</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
