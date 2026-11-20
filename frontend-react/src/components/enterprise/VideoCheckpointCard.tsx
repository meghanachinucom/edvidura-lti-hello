import { useEffect, useState } from "react";
import {
  Video,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";

interface CuePoint {
  id: string;
  video_id: string;
  timestamp_seconds: number;
  time_display: string;
  title: string;
  is_blocking: boolean;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export function VideoCheckpointCard({ videoId = "les-transformer" }: { videoId?: string }) {
  const [cues, setCues] = useState<CuePoint[]>([
    {
      id: "cue-trans-1",
      video_id: videoId,
      timestamp_seconds: 30,
      time_display: "0:30",
      title: "Core Functionality",
      is_blocking: true,
      question: "What is the primary function of the laminated iron core in a transformer?",
      options: [
        "Conduct alternating electric current directly to the secondary coil",
        "Provide a low-reluctance magnetic flux path with minimal eddy current loss",
        "Dissipate high-frequency thermal energy into the chassis",
      ],
      correct_index: 1,
      explanation:
        "The laminated silicon-steel core concentrates magnetic flux lines while laminar insulation interrupts eddy current loops.",
    },
    {
      id: "cue-trans-2",
      video_id: videoId,
      timestamp_seconds: 75,
      time_display: "1:15",
      title: "Conservation of Power",
      is_blocking: true,
      question: "In an ideal step-up transformer, what happens to current as voltage increases?",
      options: [
        "Current increases proportionally to support the voltage gain",
        "Current decreases inversely to conserve total power (P = V · I)",
        "Current remains completely constant regardless of turns ratio",
      ],
      correct_index: 1,
      explanation:
        "Energy cannot be created: as voltage steps up across the secondary turns ratio, current must step down proportionally.",
    },
    {
      id: "cue-trans-3",
      video_id: videoId,
      timestamp_seconds: 120,
      time_display: "2:00",
      title: "Industrial Isolation",
      is_blocking: true,
      question: "Why are isolation transformers mandated in clinical and precision shop floors?",
      options: [
        "To break galvanic ground loops and prevent electric shock from chassis faults",
        "To convert alternating current (AC) directly to smooth direct current (DC)",
        "To amplify incoming voltage tenfold for high-output machinery",
      ],
      correct_index: 0,
      explanation:
        "Galvanic isolation physically decouples the primary and secondary circuits, preventing dangerous fault currents to earth ground.",
    },
  ]);

  const [activeCue, setActiveCue] = useState<CuePoint | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answeredMap, setAnsweredMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(30); // starts at cue 1
  const totalDuration = 180; // 3 minutes

  useEffect(() => {
    let active = true;
    api
      .get<{ ok: boolean; cues: CuePoint[] }>(`/api/v1/video/${videoId}/cues`)
      .then((res) => {
        if (active && res && Array.isArray(res.cues) && res.cues.length > 0) {
          // enrich with time_display
          const enriched = res.cues.map((c, i) => ({
            ...c,
            time_display:
              c.timestamp_seconds === 45 ? "0:30" : c.timestamp_seconds === 120 ? "1:15" : "2:00",
            title: c.timestamp_seconds === 45 ? "Magnetic Core Function" : "Power Conservation",
          }));
          setCues(enriched);
          setActiveCue(enriched[0] ?? null);
        }
      })
      .catch(() => {
        // demo defaults
      });
    return () => {
      active = false;
    };
  }, [videoId]);

  const completedCount = Object.keys(answeredMap).filter((k) => answeredMap[k]).length;

  const handleSubmitAnswer = async () => {
    if (!activeCue || selectedIndex === null) return;
    const isCorrect = selectedIndex === activeCue.correct_index;

    try {
      await api.post("/api/v1/video/telemetry", {
        video_id: activeCue.video_id,
        cue_id: activeCue.id,
        event_type: "checkpoint_answered",
        timestamp_seconds: activeCue.timestamp_seconds,
        user_id: "6",
        metadata: { selected_index: selectedIndex, is_correct: isCorrect },
      });
    } catch {
      // safe fallback
    }

    if (isCorrect) {
      setAnsweredMap((prev) => ({ ...prev, [activeCue.id]: true }));
      setFeedback(`Correct! ${activeCue.explanation}`);
    } else {
      setFeedback("Not quite. Review the coil turns principle and try again.");
    }
  };

  const jumpToCue = (cue: CuePoint) => {
    setCurrentTime(cue.timestamp_seconds);
    setActiveCue(cue);
    setSelectedIndex(null);
    setFeedback(null);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <article
      aria-label="Interactive Video Lesson Player"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm space-y-5"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 shadow-2xs">
              <Video className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Interactive Video Lesson
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary border border-secondary/30">
              Class 8 Applied Physics
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-heading font-extrabold text-ink">
            Transformer Induction & Electrical Earthing Principles
          </h3>
          <p className="text-xs text-ink-muted">
            Video pauses at concept milestones. Complete all 3 checkpoints to earn your lesson
            badge.
          </p>
        </div>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 shrink-0 bg-page-bg px-4 py-2.5 rounded-2xl border border-border">
          <div className="text-right">
            <span className="text-xs uppercase font-bold text-ink-muted block">
              Checkpoints
            </span>
            <span className="text-sm font-extrabold text-secondary font-mono">
              {completedCount} / {cues.length} Completed
            </span>
          </div>
          <div className="w-12 h-12 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-border/60"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-secondary transition-all duration-300"
                strokeDasharray={`${(completedCount / cues.length) * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-extrabold text-ink">
              {Math.round((completedCount / cues.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Video Player Stage */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
        {/* Mock Video Canvas */}
        <div className="aspect-video w-full flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950 text-white">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              Module: PHY-08-TRANS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              1080p Masterclass Stream
            </span>
          </div>

          {/* Center visual or pause callout */}
          <div className="text-center space-y-3 max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-2xl bg-secondary/20 border border-secondary/40 text-secondary mx-auto flex items-center justify-center shadow-lg backdrop-blur-sm">
              <Video className="size-8" />
            </div>
            <h4 className="text-base sm:text-xl font-bold tracking-tight text-white font-heading">
              {activeCue ? activeCue.title : "Lesson Video Player"}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeCue && !answeredMap[activeCue.id]
                ? "Playback locked at checkpoint timestamp. Answer the diagnostic question below to continue."
                : "Checkpoint unlocked! Press play or jump to any timestamp on the timeline bar."}
            </p>
          </div>

          {/* Player controls bar */}
          <div className="space-y-3 pt-4">
            {/* Visual Timeline Scrub Bar with Checkpoint Markers */}
            <div className="relative w-full h-3 bg-slate-800 rounded-full cursor-pointer flex items-center">
              <div
                className="h-full bg-secondary rounded-full transition-all"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />

              {/* Checkpoint Markers */}
              {cues.map((c) => {
                const pos = (c.timestamp_seconds / totalDuration) * 100;
                const isCleared = answeredMap[c.id];
                const isCurrent = activeCue?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => jumpToCue(c)}
                    style={{ left: `${pos}%` }}
                    title={`Checkpoint: ${c.title} (${c.time_display})`}
                    className={`absolute -top-1.5 -ml-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition transform hover:scale-125 z-10 ${
                      isCurrent
                        ? "border-white bg-amber-500 shadow-md ring-2 ring-amber-400"
                        : isCleared
                          ? "border-emerald-300 bg-emerald-600"
                          : "border-slate-400 bg-slate-700"
                    }`}
                  >
                    {isCleared ? (
                      <CheckCircle2 className="size-2.5 text-white" />
                    ) : (
                      <span className="text-xs font-bold text-white">
                        {c.time_display.split(":")[1]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom playback row */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <span className="font-mono text-xs">
                  {formatSec(currentTime)} / {formatSec(totalDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {cues.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => jumpToCue(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      activeCue?.id === c.id
                        ? "bg-secondary text-white border-secondary"
                        : answeredMap[c.id]
                          ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {c.time_display} · {answeredMap[c.id] ? "Cleared ✓" : c.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Blocking Checkpoint Card */}
      {activeCue && (
        <div className="rounded-2xl border-2 border-secondary/30 bg-surface-raised p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <HelpCircle className="size-4" />
              </span>
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Checkpoint at {activeCue.time_display}: {activeCue.title}
              </span>
            </div>

            {answeredMap[activeCue.id] ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                Checkpoint Mastered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Lock className="size-3.5" />
                Response Required to Unlock Next Section
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-ink leading-relaxed">{activeCue.question}</p>

          <div className="space-y-2">
            {activeCue.options.map((opt, oIdx) => {
              const isSelected = selectedIndex === oIdx;
              const isAnswered = answeredMap[activeCue.id];
              const isCorrectOpt = oIdx === activeCue.correct_index;

              let btnStyle = "border-border/80 bg-surface hover:border-secondary text-ink";
              if (isAnswered) {
                if (isCorrectOpt) {
                  btnStyle =
                    "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold";
                } else if (isSelected) {
                  btnStyle = "border-rose-300 bg-rose-50 text-rose-800 opacity-60";
                }
              } else if (isSelected) {
                btnStyle =
                  "border-secondary bg-primary-fixed text-secondary font-bold ring-2 ring-secondary/50";
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => {
                    setSelectedIndex(oIdx);
                    setFeedback(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition flex items-start gap-3 ${btnStyle}`}
                >
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="leading-relaxed flex-1">{opt}</span>
                  {isAnswered && isCorrectOpt && (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                answeredMap[activeCue.id]
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-900 dark:text-rose-200"
              }`}
            >
              {feedback}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-ink-muted">
              {answeredMap[activeCue.id]
                ? "Segment unlocked. You may proceed to the next milestone."
                : "Select the most accurate principle and submit."}
            </span>

            {!answeredMap[activeCue.id] ? (
              <button
                type="button"
                disabled={selectedIndex === null}
                onClick={handleSubmitAnswer}
                className="btn-primary h-9 px-5 text-xs font-bold rounded-xl disabled:opacity-50 transition"
              >
                Submit Checkpoint Answer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const nextIndex = cues.findIndex((c) => c.id === activeCue.id) + 1;
                  if (nextIndex < cues.length) {
                    jumpToCue(cues[nextIndex]!);
                  }
                }}
                className="btn-secondary h-9 px-4 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 text-secondary"
              >
                <span>Next Milestone</span>
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
