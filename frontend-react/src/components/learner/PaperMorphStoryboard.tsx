import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Film,
} from "lucide-react";
import type { Chapter } from "@/data/ebookContent";

export interface PaperMorphStoryboardProps {
  bookId: string;
  chapter: Chapter;
  chapterIndex: number;
}

export function PaperMorphStoryboard({
  bookId,
  chapter,
  chapterIndex,
}: PaperMorphStoryboardProps) {
  const [activeBeat, setActiveBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  // Reset states when chapter changes
  useEffect(() => {
    setActiveBeat(0);
    setIsPlaying(false);
    setSelectedOption(null);
    setAnswered(false);
  }, [chapter.id, chapterIndex]);

  // Auto-play timer for storyboard beats
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveBeat((prev) => {
          if (prev >= 3) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const beats = [
    {
      title: "Beat 1: Intuition & Diagnostic Setup",
      subtitle: "Observe the foundational phenomenon before mathematical formulation",
      description: chapter.paragraphs[0] || "Foundational observations and diagnostic conditions.",
    },
    {
      title: "Beat 2: Governing Transformation & Dynamics",
      subtitle: "Apply the structural invariant and transformation rules",
      description: chapter.paragraphs[1] || "Interactive transformations, variable isolation, or schematic flow.",
    },
    {
      title: "Beat 3: Real-World Invariant & Application",
      subtitle: "Synthesizing the core lesson into an operational mental model",
      description: chapter.takeaway || chapter.paragraphs[2] || "Competency consolidation and real-world application.",
    },
    {
      title: "Beat 4: PaperMorph Interactive Concept Check",
      subtitle: "Prove understanding through an inline diagnostic challenge",
      description: "Answer the diagnostic check below to confirm competency mastery.",
    },
  ];

  // Render SVG schematic based on book and active beat
  const renderBeatIllustration = () => {
    const isMath = bookId.includes("algebra") || bookId.includes("de7900fd") || bookId.includes("11111111");
    const isScience = bookId.includes("science") || bookId.includes("22222222");
    const isRailways = bookId.includes("railway") || bookId.includes("33333333");
    const isCyber = bookId.includes("digital") || bookId.includes("cyber") || bookId.includes("44444444");

    if (isMath) {
      return (
        <svg viewBox="0 0 400 160" className="w-full h-40 rounded bg-slate-900 shadow-inner">
          {/* Grid lines */}
          <line x1="20" y1="80" x2="380" y2="80" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="200" y1="10" x2="200" y2="150" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          {/* Fulcrum and balance scale */}
          <polygon points="200,120 185,150 215,150" fill="#f59e0b" />
          <line
            x1="80"
            y1={activeBeat === 0 ? 80 : activeBeat === 1 ? 65 : 75}
            x2="320"
            y2={activeBeat === 0 ? 80 : activeBeat === 1 ? 95 : 85}
            stroke="#38bdf8"
            strokeWidth="4"
            className="transition-all duration-700 ease-in-out"
          />
          {/* Left Pan */}
          <circle cx="80" cy={activeBeat === 1 ? 75 : 90} r="22" fill="#0284c7" opacity="0.8" />
          <text x="80" y={activeBeat === 1 ? 80 : 95} fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">
            {activeBeat === 0 ? "2x + 5" : activeBeat === 1 ? "2x" : "x"}
          </text>
          {/* Right Pan */}
          <circle cx="320" cy={activeBeat === 1 ? 105 : 90} r="22" fill="#10b981" opacity="0.8" />
          <text x="320" y={activeBeat === 1 ? 110 : 95} fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">
            {activeBeat === 0 ? "15" : activeBeat === 1 ? "10" : "5"}
          </text>
          {/* Operational Annotation */}
          <text x="200" y="30" fill="#e2e8f0" fontSize="12" fontWeight="600" textAnchor="middle">
            {activeBeat === 0
              ? "Initial Equation: 2x + 5 = 15"
              : activeBeat === 1
              ? "Step 1: Subtract 5 from both sides → 2x = 10"
              : activeBeat === 2
              ? "Step 2: Divide both sides by 2 → x = 5"
              : "Invariant Proved: Balanced State Achieved"}
          </text>
        </svg>
      );
    }

    if (isScience) {
      return (
        <svg viewBox="0 0 400 160" className="w-full h-40 rounded bg-slate-900 shadow-inner">
          {/* Energy slope path */}
          <path d="M 30,30 Q 120,140 220,120 T 370,40" fill="none" stroke="#64748b" strokeWidth="4" />
          {/* Rollercoaster cart at active beat position */}
          <circle
            cx={activeBeat === 0 ? 40 : activeBeat === 1 ? 160 : 350}
            cy={activeBeat === 0 ? 38 : activeBeat === 1 ? 130 : 45}
            r="16"
            fill="#f43f5e"
            className="transition-all duration-700 ease-in-out"
          />
          {/* Force Vectors */}
          <line
            x1={activeBeat === 0 ? 40 : activeBeat === 1 ? 160 : 350}
            y1={activeBeat === 0 ? 38 : activeBeat === 1 ? 130 : 45}
            x2={activeBeat === 0 ? 80 : activeBeat === 1 ? 210 : 380}
            y2={activeBeat === 0 ? 70 : activeBeat === 1 ? 130 : 25}
            stroke="#38bdf8"
            strokeWidth="3"
            markerEnd="url(#arrow)"
          />
          <text x="200" y="25" fill="#e2e8f0" fontSize="12" fontWeight="600" textAnchor="middle">
            {activeBeat === 0
              ? "Max Potential Energy (PE = mgh, KE = 0)"
              : activeBeat === 1
              ? "Max Kinetic Energy (KE = 1/2 mv², PE = min)"
              : "Conservation of Mechanical Energy (Total E = Const)"}
          </text>
        </svg>
      );
    }

    if (isRailways) {
      return (
        <svg viewBox="0 0 400 160" className="w-full h-40 rounded bg-slate-900 shadow-inner">
          {/* Parallel Rails */}
          <line x1="20" y1="90" x2="380" y2="90" stroke="#94a3b8" strokeWidth="4" />
          <line x1="20" y1="120" x2="380" y2="120" stroke="#94a3b8" strokeWidth="4" />
          {/* Sleepers */}
          {[50, 100, 150, 200, 250, 300, 350].map((x) => (
            <line key={x} x1={x} y1="80" x2={x} y2="130" stroke="#475569" strokeWidth="3" />
          ))}
          {/* Kavach Radio Beacon & Signal */}
          <circle cx={activeBeat >= 1 ? 200 : 100} cy="50" r="14" fill={activeBeat >= 2 ? "#10b981" : "#f59e0b"} />
          <text x="200" y="30" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
            {activeBeat === 0
              ? "Track USFD Flaw Detection Probe Active"
              : activeBeat === 1
              ? "Kavach Automatic Train Protection RFID Ping Received"
              : "Absolute Block Clear: Brake Distance Computed"}
          </text>
        </svg>
      );
    }

    if (isCyber) {
      return (
        <svg viewBox="0 0 400 160" className="w-full h-40 rounded bg-slate-900 shadow-inner">
          {/* Nodes */}
          <circle cx="80" cy="80" r="24" fill="#3b82f6" />
          <text x="80" y="85" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">User</text>
          <circle cx="200" cy="80" r="26" fill="#8b5cf6" />
          <text x="200" y="85" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">DPDP</text>
          <circle cx="320" cy="80" r="24" fill="#10b981" />
          <text x="320" y="85" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">Cloud</text>
          {/* Encrypted link */}
          <line x1="104" y1="80" x2="174" y2="80" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="226" y1="80" x2="296" y2="80" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 4" />
          <text x="200" y="30" fill="#e2e8f0" fontSize="11" fontWeight="600" textAnchor="middle">
            {activeBeat === 0
              ? "Step 1: TLS 1.3 Handshake & Token Issue"
              : activeBeat === 1
              ? "Step 2: DPDP Act 2023 Consent Verification"
              : "Step 3: End-to-End Cryptographic Storage Verified"}
          </text>
        </svg>
      );
    }

    // Default Ethics / Niti
    return (
      <svg viewBox="0 0 400 160" className="w-full h-40 rounded bg-slate-900 shadow-inner">
        <circle cx="200" cy="80" r="45" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 4" />
        <circle cx="200" cy="80" r="20" fill="#f59e0b" opacity="0.8" />
        <text x="200" y="84" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">Dharma</text>
        <circle cx="110" cy="80" r="18" fill="#0284c7" />
        <text x="110" y="84" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">Satya</text>
        <circle cx="290" cy="80" r="18" fill="#10b981" />
        <text x="290" y="84" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">Vinaya</text>
        <text x="200" y="30" fill="#e2e8f0" fontSize="11" fontWeight="600" textAnchor="middle">
          Vidya Dadati Vinayam: Ethical Foundations of Self & Society
        </text>
      </svg>
    );
  };

  return (
    <div
      className="my-8 rounded-surface border-2 border-secondary/40 bg-surface p-5 shadow-sm space-y-4"
      role="region"
      aria-label="PaperMorph Interactive Storyboard Canvas"
    >
      {/* Header with Title and Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <Film className="size-4 text-secondary" />
          <h3 className="font-heading text-sm font-bold text-ink">
            PaperMorph Interactive Storyboard · Chapter {chapterIndex + 1}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-secondary">
            Beat {activeBeat + 1} of 4
          </span>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-bold text-white hover:bg-secondary/90 transition shadow-2xs"
            title={isPlaying ? "Pause Step-Through" : "Play Animated Step-Through"}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? "Pause" : "Play Animated Beat"}</span>
          </button>
        </div>
      </div>

      {/* Storyboard Navigation Pills */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {beats.map((b, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setActiveBeat(idx);
              setIsPlaying(false);
            }}
            className={`rounded-control px-2 py-1.5 text-left text-[11px] transition font-semibold ${
              activeBeat === idx
                ? "bg-secondary text-white font-bold shadow-2xs"
                : "bg-muted text-ink hover:bg-muted/80"
            }`}
          >
            <span className="block truncate">{b.title}</span>
          </button>
        ))}
      </div>

      {/* Interactive Canvas Illustration */}
      <div className="relative overflow-hidden rounded border border-border">
        {renderBeatIllustration()}
      </div>

      {/* Beat Explanatory Text */}
      <div className="rounded-control bg-page-bg p-3.5 text-xs text-ink space-y-1 border border-border">
        <p className="font-bold text-secondary">{beats[activeBeat].subtitle}</p>
        <p className="text-xs text-ink-muted leading-relaxed">{beats[activeBeat].description}</p>
      </div>

      {/* Beat 4: Integrated Interactive Concept Check Question */}
      {activeBeat === 3 && chapter.conceptCheck && (
        <div className="mt-4 rounded-surface border border-secondary/40 bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-bold text-xs text-secondary flex items-center gap-1.5">
              <HelpCircle size={14} /> Concept Check Diagnostic Challenge
            </span>
            <span className="font-mono text-[10px] text-ink-muted">Tag: {chapter.conceptCheck.skillTag}</span>
          </div>

          <p className="text-xs font-semibold text-ink">{chapter.conceptCheck.question}</p>

          <div className="space-y-1.5 pt-1">
            {chapter.conceptCheck.options.map((opt, oIdx) => {
              const isSelected = selectedOption === oIdx;
              const isCorrect = oIdx === chapter.conceptCheck.correctIndex;
              const style = answered
                ? isCorrect
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold"
                  : isSelected
                  ? "border-red-500 bg-red-500/15 text-red-800 dark:text-red-300"
                  : "border-border text-ink opacity-60"
                : "border-border hover:border-secondary text-ink";

              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => {
                    setSelectedOption(oIdx);
                    setAnswered(true);
                  }}
                  className={`w-full rounded-control border p-2.5 text-left text-xs transition flex items-center justify-between ${style}`}
                >
                  <span>{opt}</span>
                  {answered && isCorrect && <CheckCircle2 size={14} className="text-emerald-600 ml-2 shrink-0" />}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="rounded bg-page-bg p-2.5 text-xs text-ink-muted border border-border">
              <span className="font-bold text-ink">
                {selectedOption === chapter.conceptCheck.correctIndex ? "✓ Proved!" : "Guidance:"}
              </span>{" "}
              {chapter.conceptCheck.explanation}
            </div>
          )}
        </div>
      )}

      {/* Storyboard Step Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => setActiveBeat((prev) => Math.max(0, prev - 1))}
          disabled={activeBeat === 0}
          className="btn-secondary text-xs gap-1 py-1 px-3 disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Previous Beat
        </button>
        <button
          type="button"
          onClick={() => setActiveBeat((prev) => Math.min(3, prev + 1))}
          disabled={activeBeat === 3}
          className="btn-primary text-xs gap-1 py-1 px-3 disabled:opacity-40"
        >
          <span>Next Beat</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
