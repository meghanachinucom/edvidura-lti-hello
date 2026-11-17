import { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Clock,
  FileText,
  Sparkles,
  ChevronRight,
  X,
  BookOpen,
} from "lucide-react";

export interface VideoChapter {
  timeSec: number;
  label: string;
}

export interface VideoLectureItem {
  id: string;
  title: string;
  titleTe?: string;
  description: string;
  durationSec: number;
  coverUrl: string;
  speaker: string;
  chapters: VideoChapter[];
}

export const SAMPLE_LECTURES: VideoLectureItem[] = [
  {
    id: "lec-slope",
    title: "Slope as Rate of Change & Delta Intuition",
    titleTe: "సరళ సమీకరణాల ప్రాథమిక అంశాలు మరియు వాలు భావన",
    description: "Visual intuition into slope Δy/Δx, Cartesian grid translations, and slope-intercept form y = mx + b.",
    durationSec: 840,
    coverUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80",
    speaker: "Dr. K. S. Ramanujan · Department of Mathematics",
    chapters: [
      { timeSec: 0, label: "Introduction: What is Slope?" },
      { timeSec: 180, label: "Cartesian Grid & Δy / Δx" },
      { timeSec: 420, label: "Slope-Intercept y = mx + b" },
      { timeSec: 680, label: "Worked Example & Practice" },
    ],
  },
  {
    id: "lec-vedic",
    title: "Vedic Mathematical Speed Heuristics",
    titleTe: "వేగవంతమైన గణన కోసం వేద గణిత సూత్రాలు",
    description: "Algorithmic methods for mental factorization, quadratic roots, and linear transformations.",
    durationSec: 960,
    coverUrl: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80",
    speaker: "Vidwan S. Somayaji · AP State Education Council",
    chapters: [
      { timeSec: 0, label: "Sutra: Ekadhikena Purvena" },
      { timeSec: 260, label: "Cross-Multiplication Heuristics" },
      { timeSec: 540, label: "Rapid Quadratic Solutions" },
      { timeSec: 820, label: "Classroom Drills" },
    ],
  },
];

export function LessonVideoMasterclass({
  lecture = SAMPLE_LECTURES[0]!,
  compact = false,
}: {
  lecture?: VideoLectureItem;
  compact?: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [notes, setNotes] = useState<{ id: string; time: number; text: string }[]>([]);
  const [newNote, setNewNote] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`notes_${lecture.id}`);
      if (saved) setNotes(JSON.parse(saved));
    } catch {}
  }, [lecture.id]);

  const saveNotes = (updated: { id: string; time: number; text: string }[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(`notes_${lecture.id}`, JSON.stringify(updated));
    } catch {}
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const updated = [
      ...notes,
      {
        id: String(Date.now()),
        time: currentTime,
        text: newNote.trim(),
      },
    ];
    saveNotes(updated);
    setNewNote("");
  };

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden space-y-4">
      {/* Top Banner */}
      <div className="p-5 pb-0 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            <Sparkles size={14} /> Video Masterclass & Synchronous Notes
          </div>
          <h3 className="font-heading text-lg font-bold text-ink mt-0.5">{lecture.title}</h3>
          {lecture.titleTe && (
            <p className="text-xs font-serif text-amber-700 dark:text-amber-400 mt-0.5">{lecture.titleTe}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setNotesOpen(!notesOpen)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            notesOpen
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "bg-page-bg border border-border text-ink hover:border-amber-500"
          }`}
        >
          <FileText size={14} />
          <span>{notesOpen ? "Hide Notes" : `Lecture Notes (${notes.length})`}</span>
        </button>
      </div>

      <div className="px-5 grid gap-5 desktop:grid-cols-3">
        {/* Left: Video Player */}
        <div className={`space-y-3 ${notesOpen ? "desktop:col-span-2" : "desktop:col-span-3"}`}>
          <div className="relative aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden shadow-md group">
            <img
              src={lecture.coverUrl}
              alt={lecture.title}
              className="w-full h-full object-cover filter brightness-75"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-xl hover:bg-amber-400 transition"
                aria-label={isPlaying ? "Pause Video" : "Play Video"}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
            {/* Live Scrubber Line */}
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${(currentTime / Math.max(lecture.durationSec, 1)) * 100}%` }}
              />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-white/90">
              <span className="rounded bg-black/60 px-2 py-0.5 backdrop-blur-xs font-sans">{lecture.speaker}</span>
              <span className="rounded bg-black/60 px-2 py-0.5 backdrop-blur-xs">
                {formatClock(currentTime)} / {formatClock(lecture.durationSec)}
              </span>
            </div>
          </div>

          {/* Chapter Markers */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Jump to:</span>
            {lecture.chapters.map((ch, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentTime(ch.timeSec)}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  currentTime >= ch.timeSec &&
                  (idx === lecture.chapters.length - 1 || currentTime < lecture.chapters[idx + 1]!.timeSec)
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold"
                    : "bg-page-bg border border-border text-ink-muted hover:border-amber-500"
                }`}
              >
                {ch.label} ({formatClock(ch.timeSec)})
              </button>
            ))}
          </div>
        </div>

        {/* Right: Notes Drawer (if open) */}
        {notesOpen && (
          <div className="rounded-2xl border border-border bg-page-bg p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-ink">Synchronous Notes</span>
                <span className="text-[10px] font-mono text-amber-600 font-bold">
                  Pinned at {formatClock(currentTime)}
                </span>
              </div>
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-ink-muted text-center py-4">No notes pinned yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-2 rounded-xl bg-surface border border-border text-xs space-y-0.5">
                      <span className="text-[10px] font-mono text-amber-600 font-bold">
                        {formatClock(n.time)}
                      </span>
                      <p className="text-ink">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-border">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={`Pin takeaway at ${formatClock(currentTime)}...`}
                className="w-full p-2 rounded-xl border border-border bg-surface text-xs text-ink outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="w-full py-1.5 rounded-xl bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                Save Note
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="p-5 pt-0">
        <p className="text-xs text-ink-muted leading-relaxed">{lecture.description}</p>
      </div>
    </div>
  );
}
