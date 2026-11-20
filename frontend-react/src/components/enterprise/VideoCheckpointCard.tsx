import { useEffect, useState } from "react";
import { Video, CheckCircle2, Play, Lock, AlertCircle, HelpCircle } from "lucide-react";
import { api } from "@/lib/api";

interface CuePoint {
  id: string;
  video_id: string;
  timestamp_seconds: number;
  is_blocking: boolean;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export function VideoCheckpointCard({ videoId = "les-transformer" }: { videoId?: string }) {
  const [cues, setCues] = useState<CuePoint[]>([]);
  const [activeCue, setActiveCue] = useState<CuePoint | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answeredMap, setAnsweredMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ ok: boolean; cues: CuePoint[] }>(`/api/v1/video/${videoId}/cues`)
      .then((res) => {
        if (active && res && res.cues) {
          setCues(res.cues);
          if (res.cues.length > 0) setActiveCue(res.cues[0] ?? null);
        }
      })
      .catch(() => {
        // Fallback demo cue points
        const demoCues: CuePoint[] = [
          {
            id: "cue-trans-1",
            video_id: videoId,
            timestamp_seconds: 45,
            is_blocking: true,
            question: "What is the primary function of the laminated iron core in a transformer?",
            options: [
              "Conduct alternating electric current",
              "Provide a low-reluctance magnetic flux path",
              "Radiate excess thermal energy",
            ],
            correct_index: 1,
            explanation:
              "The laminated steel core guides magnetic flux efficiently with minimal eddy current losses.",
          },
          {
            id: "cue-trans-2",
            video_id: videoId,
            timestamp_seconds: 120,
            is_blocking: true,
            question:
              "In an ideal step-up transformer, what happens to current as voltage increases?",
            options: [
              "Current increases proportionally",
              "Current decreases to conserve power (P = V * I)",
              "Current remains completely constant",
            ],
            correct_index: 1,
            explanation:
              "Because power P = V * I is conserved, stepping up voltage steps down current.",
          },
        ];
        if (active) {
          setCues(demoCues);
          setActiveCue(demoCues[0] ?? null);
        }
      });
    return () => {
      active = false;
    };
  }, [videoId]);

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
      setFeedback("Incorrect. Review the schematic and try again.");
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <article
      aria-label="Interactive Video Checkpoint Player"
      className="rounded-surface border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
            <Video className="size-4.5" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-ink">
              Interactive In-Video Checkpoint Player · BF-10
            </h3>
            <p className="text-xs text-ink-muted">
              Concept mastery verification cues pause playback until understood.
            </p>
          </div>
        </div>

        {/* Checkpoint Markers */}
        <div className="flex items-center gap-1.5 bg-page-bg px-2.5 py-1 rounded-full border border-border text-xs">
          <span className="font-semibold text-ink-muted">Cues:</span>
          {cues.map((cue, idx) => (
            <button
              key={cue.id}
              type="button"
              onClick={() => {
                setActiveCue(cue);
                setSelectedIndex(null);
                setFeedback(null);
              }}
              className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                activeCue?.id === cue.id
                  ? "bg-secondary text-white"
                  : answeredMap[cue.id]
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-surface text-ink hover:bg-surface-raised"
              }`}
            >
              #{idx + 1} ({formatSeconds(cue.timestamp_seconds)})
            </button>
          ))}
        </div>
      </div>

      {activeCue ? (
        <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-secondary">
            <span className="flex items-center gap-1">
              <Lock className="size-3.5" />
              Checkpoint at {formatSeconds(activeCue.timestamp_seconds)} (Gated Progression)
            </span>
            {answeredMap[activeCue.id] && (
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                Unlocked
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-ink leading-snug">{activeCue.question}</p>

          <div className="space-y-2 pt-1">
            {activeCue.options.map((opt, oIdx) => (
              <label
                key={oIdx}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer transition ${
                  selectedIndex === oIdx
                    ? "border-secondary bg-surface text-ink font-semibold ring-1 ring-secondary"
                    : "border-border bg-surface/80 text-ink hover:bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name={`opt-${activeCue.id}`}
                  checked={selectedIndex === oIdx}
                  onChange={() => setSelectedIndex(oIdx)}
                  className="mt-0.5 text-secondary focus:ring-secondary"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={selectedIndex === null}
              onClick={handleSubmitAnswer}
              className="btn-primary text-xs font-bold px-4 py-2 disabled:opacity-40"
            >
              Verify Understanding
            </button>
            {feedback && (
              <p
                className={`text-xs font-semibold ${
                  feedback.startsWith("Correct") ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {feedback}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">No checkpoint cues configured for this media item.</p>
      )}
    </article>
  );
}
