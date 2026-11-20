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
    <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm space-y-6">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary/10 text-secondary px-3 py-0.5 text-xs font-bold tracking-wide">
              Interactive Storyboard Beat {currentBeatIdx + 1} of {beats.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">{chapterTitle}</span>
          </div>
          <h2 className="font-heading text-xl font-bold text-slate-900 mt-1">
            {currentBeat.title}
          </h2>
        </div>

        {/* Speed & Close Controls */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-600 font-semibold" htmlFor="stage-speed-select">
            Narration Speed:
          </label>
          <select
            id="stage-speed-select"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-surface px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:border-secondary focus:outline-none"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x (Normal)</option>
            <option value={1.25}>1.25x</option>
          </select>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 ml-2"
            >
              Return to Book
            </button>
          )}
        </div>
      </div>

      {/* 16:9 Synchronized Visual Diagram Stage */}
      <div className="relative aspect-video w-full max-w-3xl mx-auto flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/60 p-6 text-center shadow-inner overflow-hidden">
        {currentBeat.visual_diagram?.type === "balance_scale" && (
          <div className="space-y-6 w-full max-w-lg mx-auto">
            <div className="flex justify-between items-center px-6">
              <div className="bg-white border-2 border-secondary text-secondary font-mono font-bold text-lg rounded-2xl px-6 py-3 shadow-md">
                {currentBeat.visual_diagram["left"]}
              </div>
              <div className="size-10 flex items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-xl shadow-xs">
                =
              </div>
              <div className="bg-white border-2 border-secondary text-secondary font-mono font-bold text-lg rounded-2xl px-6 py-3 shadow-md">
                {currentBeat.visual_diagram["right"]}
              </div>
            </div>
            {/* Fulcrum scale representation */}
            <div className="relative w-4/5 mx-auto">
              <div className="h-2 bg-slate-300 rounded-full w-full" />
              <div className="size-5 bg-secondary rounded-full absolute left-1/2 -top-1.5 -translate-x-1/2 shadow-xs ring-4 ring-white" />
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-slate-400 mx-auto mt-2" />
            </div>
            <p className="text-xs font-medium text-slate-600">
              Balanced scale: Whatever operation is applied to one side must be applied equally to
              the other.
            </p>
          </div>
        )}

        {currentBeat.visual_diagram?.type === "step_transformation" && (
          <div className="space-y-4 w-full max-w-md mx-auto">
            <div className="text-sm font-mono text-ink-muted line-through">
              {currentBeat.visual_diagram["initial"]}
            </div>
            <div className="inline-block rounded-xl bg-amber-100 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
              ⚡ {currentBeat.visual_diagram["action"]}
            </div>
            <div className="text-lg font-bold font-mono text-emerald-800 bg-emerald-50 border-2 border-emerald-400 px-6 py-3 rounded-2xl shadow-md">
              {currentBeat.visual_diagram["result"]}
            </div>
            <p className="text-xs font-medium text-slate-600">
              Variable term isolated using inverse operation.
            </p>
          </div>
        )}

        {currentBeat.visual_diagram?.type !== "balance_scale" &&
          currentBeat.visual_diagram?.type !== "step_transformation" && (
            <div className="space-y-3">
              <div className="size-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto text-secondary shadow-xs">
                <Sparkles size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-900">{currentBeat.title}</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {currentBeat.narration_text.slice(0, 140)}...
              </p>
            </div>
          )}
      </div>

      {/* Narration Player & Subtitles */}
      <div className="rounded-xl border border-slate-200 bg-surface p-4 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayAudio}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition ${
                isPlaying ? "bg-rose-600 animate-pulse" : "bg-secondary hover:bg-secondary/90"
              }`}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? "Pause Narration" : "Listen to Beat"}</span>
            </button>
            <span className="text-xs text-slate-500 font-medium">
              {currentBeat.duration_sec}s concept segment
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Volume2 size={15} className="text-secondary" />
            <span>Voice Language: {bcp47}</span>
          </div>
        </div>

        {/* Captions Text */}
        <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-xs block mb-1">
            Narration Subtitles
          </span>
          {(currentBeat.narration_translations && currentBeat.narration_translations[locale]) ||
            currentBeat.narration_text}
        </div>
      </div>

      {/* Media Beat Navigation Bar */}
      <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => setCurrentBeatIdx((idx) => Math.max(0, idx - 1))}
          disabled={currentBeatIdx === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          <span>Previous Beat</span>
        </button>

        {/* Beat 1 of N dots */}
        <div className="flex items-center gap-2">
          {beats.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentBeatIdx(idx)}
              aria-label={`Jump to Beat ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentBeatIdx
                  ? "w-8 bg-secondary"
                  : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCurrentBeatIdx((idx) => Math.min(beats.length - 1, idx + 1))}
          disabled={currentBeatIdx === beats.length - 1}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          <span>Next Beat</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Interactive Quick-Check Card */}
      {currentBeat.inline_check && (
        <div className="rounded-2xl border-2 border-secondary/30 bg-secondary/5 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-secondary/20">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider">
              <HelpCircle size={16} />
              <span>Interactive Concept Check</span>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Immediate Concept Reinforcement
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-900 leading-snug">
            {currentBeat.inline_check.question}
          </p>

          <div className="space-y-2">
            {currentBeat.inline_check.options.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isRight = optIdx === currentBeat.inline_check?.correct_index;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleOptionSelect(optIdx)}
                  className={`w-full text-left rounded-xl p-3 text-xs font-medium border transition-all ${
                    isSelected
                      ? isRight
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/30"
                        : "bg-rose-50 border-rose-500 text-rose-900 font-bold ring-2 ring-rose-500/30"
                      : "bg-surface border-slate-200 text-slate-800 hover:border-secondary hover:bg-slate-50"
                  }`}
                >
                  <span className="font-mono font-bold mr-2 text-slate-600">
                    {String.fromCharCode(65 + optIdx)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`rounded-xl p-3 text-xs border font-medium ${
                isCorrect
                  ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                  : "bg-amber-100 border-amber-300 text-amber-900"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <CheckCircle2 size={15} />
                <span>{isCorrect ? "Correct!" : "Feedback & Guidance:"}</span>
              </div>
              <p className="leading-relaxed">{feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
