import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Maximize2,
  Sun,
  Eye,
  BookOpen,
} from "lucide-react";
import { getLocaleBcp47, t, useLocale } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ebookChapters, type Chapter } from "@/data/ebookContent";
import type { Ebook } from "@/data/ebooks";
import { mockState } from "@/data/mockState";
import { useRole } from "@/components/shell/RoleContext";
import { api } from "@/lib/api";

const s = (k: string) => t(`LR-16.${k}`);
const r = (k: string) => t(`LR-15.${k}`);

export type ReaderTheme = "standard" | "sepia" | "contrast";
export type FontSize = "80%" | "100%" | "125%" | "150%";

export function StandaloneReader({
  book,
  chapters: initialChapters,
}: {
  book: Ebook;
  chapters?: Chapter[];
}) {
  const m = mockState.reader;
  const { session } = useRole();
  const { locale, bcp47 } = useLocale();
  const chapters =
    initialChapters && initialChapters.length > 0
      ? initialChapters
      : (ebookChapters[book.id] ?? ebookChapters[book.slug] ?? []);

  const [ci, setCi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);

  // Accessibility States
  const [fontSize, setFontSize] = useState<FontSize>("100%");
  const [theme, setTheme] = useState<ReaderTheme>("standard");

  // Read-Aloud Audiobook States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeParaIndex, setActiveParaIndex] = useState<number | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // PaperMorph Concept Check States
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [conceptCheckAnswered, setConceptCheckAnswered] = useState(false);

  useEffect(() => {
    if (m.state === "renderError" || m.state === "chapterMissing") {
      setLoading(false);
      return;
    }
    const id = setTimeout(
      () => setLoading(false),
      m.state === "slow" ? 5000 : m.state === "loading" ? 60_000 : m.loadingMs,
    );
    return () => clearTimeout(id);
  }, [m.state, m.loadingMs]);

  const chapter = m.state === "chapterMissing" ? undefined : chapters[ci];

  // Stop speech when navigating chapters or unmounting
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveParaIndex(null);
    setSelectedOption(null);
    setShowExplanation(false);
    setConceptCheckAnswered(false);
  }, [ci]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const go = (n: number) => {
    setCi(n);
    setTocOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Audiobook Playback Logic with active paragraph highlighting
  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !chapter) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setActiveParaIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const fullText = `${chapter.title}. ${chapter.paragraphs.join(" ")}`;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = playbackSpeed;

    // Use user-selected Indian language or fallback
    utterance.lang = bcp47 || "en-IN";

    utterance.onboundary = (event) => {
      if (event.name === "sentence" || event.name === "word") {
        const textUpToChar = fullText.slice(0, event.charIndex);
        let paraCount = 0;
        let cumulative = `${chapter.title}. `;
        for (let i = 0; i < chapter.paragraphs.length; i++) {
          cumulative += `${chapter.paragraphs[i]} `;
          if (textUpToChar.length < cumulative.length) {
            paraCount = i;
            break;
          }
        }
        setActiveParaIndex(paraCount);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setActiveParaIndex(null);
      // Track reading audio completed
      try {
        api
          .post(`/api/v1/app/manuals/${book.id}/progress`, {
            chapter_index: ci,
            location: `audio_completed:ch-${ci}`,
            percent: Math.round(((ci + 1) / chapters.length) * 100),
          })
          .catch(() => {});
      } catch {}
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveParaIndex(null);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleConceptCheckSubmit = (optionIdx: number) => {
    setSelectedOption(optionIdx);
    setShowExplanation(true);
    setConceptCheckAnswered(true);

    const isCorrect = chapter?.conceptCheck && optionIdx === chapter.conceptCheck.correctIndex;

    // Emit xAPI progress / interaction
    try {
      api
        .post(`/api/v1/app/manuals/${book.id}/progress`, {
          chapter_index: ci,
          location: `concept_check:${chapter?.id}:${isCorrect ? "correct" : "incorrect"}`,
          percent: Math.round(((ci + 1) / chapters.length) * 100),
        })
        .catch(() => {});
    } catch {}
  };

  // Theme container classes
  const themeContainerClass =
    theme === "sepia"
      ? "bg-[#fbf0d9] text-[#433422] border-[#e8d8b8]"
      : theme === "contrast"
        ? "bg-[#0f172a] text-[#f8fafc] border-[#334155]"
        : "bg-surface text-ink border-border";

  const fontStyle = {
    fontSize:
      fontSize === "80%"
        ? "0.9rem"
        : fontSize === "125%"
          ? "1.25rem"
          : fontSize === "150%"
            ? "1.45rem"
            : "1.05rem",
    lineHeight: "1.8",
  };

  const Toc = () => (
    <nav aria-label={r("chapters")} className="text-inherit">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <h2 className="font-heading text-[17px] font-bold">{r("chapters")}</h2>
        <span className="text-xs opacity-70 font-mono">
          {ci + 1} of {chapters.length}
        </span>
      </div>
      <ol className="mt-3 space-y-1.5">
        {chapters.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              aria-current={i === ci ? "true" : undefined}
              onClick={() => go(i)}
              className={`min-h-10 w-full rounded-control px-3 py-2 text-left text-xs transition-colors flex items-start gap-2 ${
                i === ci
                  ? "font-bold bg-secondary/15 text-secondary border-l-4 border-secondary"
                  : "hover:bg-black/5 dark:hover:bg-white/5 opacity-85"
              }`}
            >
              <span className="font-mono text-[11px] opacity-60 shrink-0 mt-0.5">0{i + 1}</span>
              <span className="line-clamp-2 leading-tight">{c.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${theme === "sepia" ? "bg-[#f4ebd0]" : theme === "contrast" ? "bg-[#020617]" : "bg-page-bg"}`}
    >
      <div className="mx-auto w-full max-w-content px-4 py-6 desktop:max-w-[1240px]">
        {/* Navigation & Title Header */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <Link
              to="/manuals"
              className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-secondary hover:underline"
            >
              <ArrowLeft aria-hidden size={16} />
              {s("back")}
            </Link>
            <PageHeading text={book.title} />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 font-semibold text-secondary">
                {book.subjectCode || "Curriculum"}
              </span>
              <span>·</span>
              <span>{book.classLevel || "Class 8"}</span>
              <span>·</span>
              <span>{book.author}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            className="btn-secondary shrink-0 gap-2 desktop:hidden"
          >
            <List aria-hidden size={18} />
            {r("chapters")}
          </button>
        </header>

        {/* F-03 & REQ-03: Integrated Accessibility & Audiobook Toolbar */}
        <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-surface border border-border bg-surface px-4 py-2.5 text-xs shadow-2xs">
          {/* Zoom / Font Size Controls */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Font size controls">
            <span className="font-semibold text-ink-muted mr-1 flex items-center gap-1">
              <Eye size={14} />
              <span>Zoom:</span>
            </span>
            {(["80%", "100%", "125%", "150%"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                aria-pressed={fontSize === size}
                className={`rounded px-2 py-1 font-semibold transition ${
                  fontSize === size
                    ? "bg-secondary text-white shadow-2xs"
                    : "bg-muted text-ink hover:bg-muted/80"
                }`}
              >
                {size === "80%" ? "A-" : size === "100%" ? "100%" : size === "125%" ? "A+" : "150%"}
              </button>
            ))}
          </div>

          {/* Reading Theme Switcher */}
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label="Reading theme controls"
          >
            <span className="font-semibold text-ink-muted mr-1 flex items-center gap-1">
              <Sun size={14} />
              <span>Theme:</span>
            </span>
            <button
              type="button"
              onClick={() => setTheme("standard")}
              aria-pressed={theme === "standard"}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                theme === "standard"
                  ? "bg-secondary text-white"
                  : "bg-muted text-ink hover:bg-muted/80"
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setTheme("sepia")}
              aria-pressed={theme === "sepia"}
              className={`rounded px-2.5 py-1 font-semibold transition bg-[#fbf0d9] text-[#433422] border ${
                theme === "sepia" ? "ring-2 ring-amber-700 font-bold" : "border-amber-300"
              }`}
            >
              Sepia
            </button>
            <button
              type="button"
              onClick={() => setTheme("contrast")}
              aria-pressed={theme === "contrast"}
              className={`rounded px-2.5 py-1 font-semibold transition bg-[#0f172a] text-[#f8fafc] border ${
                theme === "contrast" ? "ring-2 ring-cyan-400 font-bold" : "border-slate-700"
              }`}
            >
              High Contrast AA
            </button>
          </div>

          {/* Audiobook / Read-Aloud Controls */}
          <div className="flex items-center gap-2" role="group" aria-label="Audiobook player">
            <button
              type="button"
              onClick={toggleSpeech}
              className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 font-bold transition ${
                isPlaying
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
              title={isPlaying ? "Pause Audiobook" : "Listen (Read-Aloud)"}
            >
              {isPlaying ? <Pause size={14} /> : <Volume2 size={14} />}
              <span>{isPlaying ? "Pause Audio" : "Listen (TTS)"}</span>
            </button>

            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              aria-label="Audio playback speed"
              className="rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-ink"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
            </select>
          </div>
        </div>

        {/* Reader Layout Grid */}
        <div className="mt-6 desktop:grid desktop:grid-cols-[280px_minmax(0,1fr)] desktop:gap-8">
          {/* Desktop Table of Contents Sidebar */}
          <aside className="hidden desktop:block">
            <div
              className={`sticky top-20 rounded-surface border p-4 shadow-sm ${themeContainerClass}`}
            >
              <Toc />
            </div>
          </aside>

          {/* Main Chapter Content Column */}
          <div className="min-w-0">
            {m.state === "renderError" ? (
              <ErrorAlert message={r("renderError")} />
            ) : !chapter ? (
              <ErrorAlert message={r("chapterMissing")} />
            ) : loading ? (
              <div className="max-w-reading space-y-3">
                <LoadingSkeleton count={6} />
                <SlowNetworkNote pending={loading} />
              </div>
            ) : (
              <article
                className={`rounded-surface border p-6 desktop:p-10 shadow-sm transition-colors duration-200 ${themeContainerClass}`}
              >
                <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-3">
                  <span className="font-mono text-xs uppercase tracking-wider opacity-70">
                    Chapter {ci + 1} of {chapters.length}
                  </span>
                  <span className="text-xs opacity-70">
                    Page {chapter.startPage} · ~
                    {Math.ceil(chapter.paragraphs.join(" ").split(" ").length / 150)} min read
                  </span>
                </div>

                <h1 className="font-heading text-2xl desktop:text-3xl font-extrabold tracking-tight mb-6">
                  {chapter.title}
                </h1>

                {/* Paragraphs with Read-Aloud Highlighting */}
                <div className="space-y-5" style={fontStyle}>
                  {chapter.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className={`rounded-control p-2 transition-colors ${
                        activeParaIndex === i
                          ? "bg-secondary/20 ring-2 ring-secondary/50 font-medium"
                          : ""
                      }`}
                    >
                      {p}
                    </p>
                  ))}
                </div>

                {/* PaperMorph Synchronized Diagram Callout */}
                {chapter.diagramTitle && (
                  <div className="my-8 rounded-surface border border-secondary/30 bg-secondary/5 p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-secondary mb-2">
                      <Sparkles size={16} />
                      <span>{chapter.diagramTitle}</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{chapter.diagramCaption}</p>
                  </div>
                )}

                {/* Key Takeaway */}
                {chapter.takeaway && (
                  <div className="my-6 rounded-surface border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={15} />
                      <span>Key Competency Takeaway:</span>
                    </div>
                    <p className="leading-relaxed opacity-90">{chapter.takeaway}</p>
                  </div>
                )}

                {/* PaperMorph Inline Chapter Quick-Check Card */}
                {chapter.conceptCheck && (
                  <div className="my-8 rounded-surface border-2 border-primary/40 bg-surface p-6 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                        <HelpCircle size={15} />
                        <span>Interactive Concept Quick-Check</span>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                        Tag: {chapter.conceptCheck.skillTag}
                      </span>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-ink">
                      {chapter.conceptCheck.question}
                    </p>

                    <div className="mt-4 space-y-2">
                      {chapter.conceptCheck.options.map((opt, oIdx) => {
                        const isSelected = selectedOption === oIdx;
                        const isCorrect = oIdx === chapter.conceptCheck.correctIndex;
                        const buttonStyle =
                          conceptCheckAnswered && isSelected
                            ? isCorrect
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold"
                              : "border-red-500 bg-red-500/15 text-red-800 dark:text-red-300"
                            : conceptCheckAnswered && isCorrect
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold"
                              : "border-border hover:border-primary/60 text-ink";

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleConceptCheckSubmit(oIdx)}
                            className={`w-full rounded-control border p-3 text-left text-xs transition flex items-center justify-between ${buttonStyle}`}
                          >
                            <span>{opt}</span>
                            {conceptCheckAnswered && isCorrect && (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {showExplanation && (
                      <div className="mt-4 rounded-control bg-page-bg p-3.5 text-xs text-ink-muted border border-border">
                        <p className="font-semibold text-ink mb-1">
                          {selectedOption === chapter.conceptCheck.correctIndex
                            ? "✓ Correct!"
                            : "Review Guidance:"}
                        </p>
                        <p className="leading-relaxed">{chapter.conceptCheck.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Chapter Navigation Buttons */}
                <nav
                  aria-label={s("chapterNav")}
                  className="mt-8 flex justify-between gap-3 border-t border-border/60 pt-6"
                >
                  <button
                    type="button"
                    onClick={() => go(ci - 1)}
                    disabled={ci === 0}
                    className="btn-secondary gap-1 disabled:opacity-40"
                  >
                    <ChevronLeft aria-hidden size={18} />
                    <span>Previous Chapter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => go(ci + 1)}
                    disabled={ci >= chapters.length - 1}
                    className="btn-primary gap-1 disabled:opacity-40"
                  >
                    <span>Next Chapter</span>
                    <ChevronRight aria-hidden size={18} />
                  </button>
                </nav>
              </article>
            )}
          </div>
        </div>

        {/* Mobile BottomSheet Table of Contents */}
        <BottomSheet open={tocOpen} title={r("chapters")} onClose={() => setTocOpen(false)}>
          <div className="p-4">
            <Toc />
          </div>
        </BottomSheet>
      </div>
    </div>
  );
}
