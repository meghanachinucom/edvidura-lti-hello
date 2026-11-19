import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  List,
  NotebookPen,
  Volume2,
  Sparkles,
  Globe,
  MessageSquare,
  Film,
} from "lucide-react";
import { t, useLocale } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toast } from "@/components/shared/Toast";
import { ebookChapters, type Chapter } from "@/data/ebookContent";
import type { Ebook } from "@/data/ebooks";
import { mockState } from "@/data/mockState";
import { explanationFor } from "@/data/readerExplanations";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useRole } from "@/components/shell/RoleContext";
import type { BackendProgressItem, BackendBookmarkItem } from "@/lib/adapters";
import { InteractiveChapterStage } from "@/components/learner/InteractiveChapterStage";

const s = (k: string, v?: Record<string, string | number>) => t(`LR-15.${k}`, v);

interface Mark {
  id: number;
  chapterId: string;
  para: number;
  text: string;
  note: string;
}
interface Sel {
  para: number;
  text: string;
}

export interface EbookReaderProps {
  book: Ebook;
  initialChapters?: Chapter[];
  initialProgress?: BackendProgressItem | null;
  initialBookmarks?: BackendBookmarkItem[];
}

/** Reading-first: quiet chrome, 68ch column, tools kept outside the text. In-memory only. */
export function EbookReader({
  book,
  initialChapters,
  initialProgress,
  initialBookmarks,
}: EbookReaderProps) {
  const m = mockState.reader;
  const { session } = useRole();
  const tenantId = session?.tenantId || "default";
  const userId = session?.username || "learner";
  const storageKey = `edv_bm:${tenantId}:${userId}:${book.id}`;

  const chapters =
    initialChapters && initialChapters.length > 0
      ? initialChapters
      : (ebookChapters[book.id] ?? []);
  const startPage = book.currentPage ?? 1;
  const initial =
    initialProgress && initialProgress.chapter_index !== undefined
      ? initialProgress.chapter_index
      : chapters.reduce((acc, c, i) => (c.startPage <= startPage ? i : acc), 0);
  const [ci, setCi] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    // 1. Try local storage first
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "number")) {
          return parsed;
        }
      }
    } catch {
      // Storage unavailable / private browsing
    }
    // 2. Fall back to initial bookmarks if passed
    if (initialBookmarks && initialBookmarks.length > 0) {
      return initialBookmarks.map((b) => {
        const c = chapters[b.chapter_index];
        return c ? c.startPage : b.chapter_index * 10 + 1;
      });
    }
    return [];
  });
  const [sel, setSel] = useState<Sel | null>(null);
  const [noteFor, setNoteFor] = useState<Sel | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pending, setPending] = useState<Omit<Mark, "id"> | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [darkMode, setDarkMode] = useState(false);
  const [wideReading, setWideReading] = useState(false);
  const [toDelete, setToDelete] = useState<Mark | null>(null);
  const [hint, setHint] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const isCancelledRef = useRef(false);
  const textRef = useRef<HTMLDivElement>(null);
  const { bcp47 } = useLocale();
  const [readerMode, setReaderMode] = useState<"read" | "interactive">("read");
  const [transformedText, setTransformedText] = useState<{ command: string; text: string } | null>(
    null,
  );
  const [transforming, setTransforming] = useState(false);
  const dismiss = useCallback(() => setToast(null), []);

  const transformSelection = async (command: "simplify" | "translate") => {
    if (!sel || !sel.text) return;
    setTransforming(true);
    try {
      const res = await api.post<{ ok?: boolean; transformed?: string; transformed_text?: string }>(
        "/api/v1/app/voice/edit-selection",
        {
          selected_text: sel.text,
          spoken_command: command,
          language: bcp47,
        },
      );
      const text = res.transformed || res.transformed_text || sel.text;
      setTransformedText({ command, text });
    } catch {
      setTransformedText({
        command,
        text:
          command === "simplify"
            ? `Simplified: ${sel.text.split(".")[0]}.`
            : `Translation (${bcp47}): ${sel.text}`,
      });
    } finally {
      setTransforming(false);
    }
  };

  const speakSelection = () => {
    if (!sel || !sel.text || typeof window === "undefined" || !("speechSynthesis" in window))
      return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sel.text);
    u.lang = bcp47;
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (m.state === "renderError" || m.state === "chapterMissing") {
      setLoading(false);
      return;
    }
    const id = setTimeout(
      () => {
        setLoading(false);
        const resumePage =
          book.currentPage || (initialProgress ? initialProgress.chapter_index * 10 + 1 : null);
        if (resumePage && resumePage > 1) {
          setToast(s("resume", { n: resumePage }));
        }
      },
      m.state === "slow" ? 5000 : m.state === "loading" ? 60_000 : m.loadingMs,
    );
    return () => clearTimeout(id);
  }, [m.state, m.loadingMs, book.currentPage, initialProgress]);

  useEffect(() => {
    if (book.id) {
      api
        .post(`/api/v1/app/manuals/${book.id}/events`, {
          event_type: "ebook_initialized",
          version: 1,
        })
        .catch(() => {});

      if (initial > 0) {
        api
          .post(`/api/v1/app/manuals/${book.id}/events`, {
            event_type: "session_resumed",
            version: 1,
            chapter_index: initial,
          })
          .catch(() => {});
      }
    }
  }, [book.id, initial]);

  const chapter: Chapter | undefined = m.state === "chapterMissing" ? undefined : chapters[ci];
  const page = chapter
    ? Math.max(chapter.startPage, ci === initial ? startPage : chapter.startPage)
    : 1;
  const bookmarked = bookmarks.includes(page);

  const chapterStartTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    chapterStartTimeRef.current = Date.now();
    return () => {
      if (book.id && chapter) {
        const elapsedSeconds = Math.max(
          1,
          Math.round((Date.now() - chapterStartTimeRef.current) / 1000),
        );
        api
          .post(`/api/v1/app/manuals/${book.id}/page-time`, {
            chapter_slug: chapter.id || `chapter-${ci + 1}`,
            page_label: chapter.title || `Chapter ${ci + 1}`,
            seconds: elapsedSeconds,
          })
          .catch(() => {});
      }
    };
  }, [ci, book.id, chapter?.id, chapter?.title]);

  useEffect(() => {
    setSpeechAvailable("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  }, []);
  useEffect(() => {
    setSpeaking(false);
    setExplanation(null);
    return () => {
      isCancelledRef.current = true;
      if (utterance.current) {
        utterance.current.onend = null;
        utterance.current.onerror = null;
        utterance.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, [ci, book.id]);
  const listen = () => {
    if (!speechAvailable || !chapter) return;
    if (speaking) {
      isCancelledRef.current = true;
      if (utterance.current) {
        utterance.current.onend = null;
        utterance.current.onerror = null;
      }
      utterance.current = null;
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    const next = new SpeechSynthesisUtterance([chapter.title, ...chapter.paragraphs].join("\n\n"));
    next.lang = "en-IN";
    isCancelledRef.current = false;
    let completed = false;

    const finish = () => {
      if (isCancelledRef.current || completed) return;
      if (utterance.current === next) {
        completed = true;
        utterance.current = null;
        setSpeaking(false);
        api
          .post(`/api/v1/app/manuals/${book.id}/events`, {
            event_type: "audio_completed",
            version: 1,
            chapter_index: ci,
            chapter_title: chapter.title,
          })
          .catch(() => {});
      }
    };

    const handleFail = () => {
      if (utterance.current === next) {
        utterance.current = null;
        setSpeaking(false);
      }
    };

    next.onend = finish;
    next.onerror = handleFail;
    utterance.current = next;
    setSpeaking(true);
    api
      .post(`/api/v1/app/manuals/${book.id}/events`, {
        event_type: "audio_started",
        version: 1,
        chapter_index: ci,
        chapter_title: chapter.title,
      })
      .catch(() => {});
    try {
      window.speechSynthesis.speak(next);
    } catch {
      handleFail();
    }
  };

  const readSelection = (): Sel | null => {
    const ws = window.getSelection();
    const text = ws?.toString().trim();
    if (!ws || !text || !textRef.current) return null;
    const p = ws.anchorNode?.parentElement?.closest<HTMLElement>("[data-para]");
    if (!p || !textRef.current.contains(p)) return null;
    return { para: Number(p.dataset["para"]), text };
  };

  const save = (item: Omit<Mark, "id">) => {
    setSaveState("saving");
    setPending(item);
    setTimeout(() => {
      if (m.save === "error") {
        setSaveState("error");
        return;
      }
      setMarks((xs) => [...xs, { ...item, id: Date.now() }]);
      setPending(null);
      setSaveState("saved");
    }, m.savingMs);
  };
  const highlight = (x: Sel | null) => {
    if (!x || !chapter) {
      setHint(true);
      return;
    }
    setHint(false);
    setSel(null);
    window.getSelection()?.removeAllRanges();
    save({ chapterId: chapter.id, para: x.para, text: x.text, note: "" });
  };
  const openNote = (x: Sel | null) => {
    if (!x) {
      setHint(true);
      return;
    }
    setHint(false);
    setSel(null);
    setNoteFor(x);
    setNoteText("");
  };
  const toggleBookmark = async () => {
    const isBm = bookmarks.includes(page);
    if (isBm) {
      const nextBookmarks = bookmarks.filter((p) => p !== page);
      setBookmarks(nextBookmarks);
      setToast(s("bookmarkRemoved"));
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextBookmarks));
      } catch {
        // Storage quota / privacy mode fallback
      }
    } else {
      const nextBookmarks = [...bookmarks, page];
      setBookmarks(nextBookmarks);
      setToast(s("bookmarkAdded"));
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextBookmarks));
      } catch {
        // Storage quota / privacy mode fallback
      }
    }
  };
  const go = (n: number) => {
    setCi(n);
    setSel(null);
    window.scrollTo({ top: 0 });
    if (chapters.length > 0) {
      const pct = Math.round(((n + 1) / chapters.length) * 100);
      api
        .post(`/api/v1/app/manuals/${book.id}/progress`, {
          version: 1,
          chapter_index: n,
          progress_percent: pct,
        })
        .catch(() => {});

      api
        .post(`/api/v1/app/manuals/${book.id}/events`, {
          event_type: "chapter_experienced",
          version: 1,
          chapter_index: n,
          chapter_title: chapters[n]?.title || `Chapter ${n + 1}`,
        })
        .catch(() => {});
    }
  };

  const chapterMarks = marks.filter((x) => x.chapterId === chapter?.id);

  const Toc = () => (
    <div className="space-y-6 text-ink">
      <nav aria-label={s("chapters")}>
        <h2 className="font-heading text-[18px]">{s("chapters")}</h2>
        <ol className="mt-2 space-y-1">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                aria-current={i === ci ? "true" : undefined}
                onClick={() => {
                  go(i);
                  setTocOpen(false);
                }}
                className={`min-h-11 w-full rounded-surface px-2 text-left ${i === ci ? "font-semibold text-accent" : "hover:bg-secondary-container/40"}`}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <section>
        <h2 className="font-heading text-[18px]">{s("bookmarks")}</h2>
        {bookmarks.length === 0 ? (
          <p className="mt-2 text-ink-muted">{s("noBookmarks")}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {bookmarks.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => {
                    const targetIdx = chapters.findIndex((c) => c.startPage === p);
                    if (targetIdx !== -1) {
                      go(targetIdx);
                      setTocOpen(false);
                    }
                  }}
                  className="min-h-11 w-full text-left text-sm text-secondary hover:underline"
                >
                  {s("page", { n: p, total: book.pages })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  const renderPara = (text: string, idx: number) => {
    const hl = chapterMarks.find((x) => x.para === idx && text.includes(x.text));
    if (!hl) return text;
    const at = text.indexOf(hl.text);
    return (
      <>
        {text.slice(0, at)}
        <mark className="bg-highlight text-ink">{hl.text}</mark>
        {text.slice(at + hl.text.length)}
      </>
    );
  };

  return (
    <div
      className={`mx-auto w-full max-w-content px-4 py-6 desktop:max-w-[1400px] ${darkMode ? "reader-dark rounded-surface" : ""}`}
    >
      <header className="space-y-3 border-b border-border pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <PageHeading text={book.title} />
            <p className="text-sm text-ink-muted">{s("edition")}</p>
          </div>
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            className="btn-secondary shrink-0 gap-2 desktop:hidden"
          >
            <List aria-hidden size={18} />
            {s("chapters")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => go(ci - 1)}
            disabled={ci === 0 || !chapter}
            className="btn-secondary gap-1"
          >
            <ChevronLeft aria-hidden size={18} />
            {s("prev")}
          </button>
          <button
            type="button"
            onClick={() => go(ci + 1)}
            disabled={ci >= chapters.length - 1 || !chapter}
            className="btn-secondary gap-1"
          >
            {s("next")}
            <ChevronRight aria-hidden size={18} />
          </button>
          <button
            type="button"
            aria-pressed={bookmarked}
            onClick={toggleBookmark}
            disabled={!chapter || loading}
            className="btn-secondary gap-2"
          >
            {bookmarked ? (
              <BookmarkCheck aria-hidden size={18} />
            ) : (
              <Bookmark aria-hidden size={18} />
            )}
            {s("bookmark")}
          </button>
          <button type="button" onClick={() => setNotesOpen(true)} className="btn-secondary gap-2">
            <NotebookPen aria-hidden size={18} />
            {s("notes")}
          </button>
          <Button
            type="button"
            variant="ghost"
            onClick={listen}
            disabled={!speechAvailable || !chapter || loading}
            aria-pressed={speaking}
            aria-describedby={!speechAvailable ? "speech-unavailable" : undefined}
            className="btn-secondary learning-control h-auto"
          >
            {speaking ? (
              <span aria-hidden className="speech-equaliser">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <Volume2 aria-hidden size={18} />
            )}
            {t(`pass3.reader.${speaking ? "stop" : "listen"}`)}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            {s("fontSize")}
            <input
              type="range"
              min={16}
              max={24}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              aria-label={s("fontSize")}
            />
          </label>
          <button
            type="button"
            aria-pressed={darkMode}
            onClick={() => setDarkMode((value) => !value)}
            className="btn-secondary"
          >
            {s(darkMode ? "lightMode" : "darkMode")}
          </button>
          <button
            type="button"
            aria-pressed={wideReading}
            onClick={() => setWideReading((value) => !value)}
            className="btn-secondary"
          >
            {s(wideReading ? "narrowWidth" : "wideWidth")}
          </button>
        </div>
        {!speechAvailable && (
          <p id="speech-unavailable" className="text-sm text-ink-muted">
            {t("pass3.reader.unavailable")}
          </p>
        )}
      </header>

      {/* Reader Mode Switcher */}
      <div className="mt-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 p-1 bg-surface border border-border rounded-pill">
          <button
            type="button"
            onClick={() => setReaderMode("read")}
            className={`px-3 py-1 text-xs font-semibold rounded-pill transition-colors ${
              readerMode === "read"
                ? "bg-brand text-white shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            📖 Read Book
          </button>
          <button
            type="button"
            onClick={() => setReaderMode("interactive")}
            className={`px-3 py-1 text-xs font-semibold rounded-pill transition-colors flex items-center gap-1.5 ${
              readerMode === "interactive"
                ? "bg-brand text-white shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Film size={13} />
            <span>Watch Interactive Chapter</span>
          </button>
        </div>
        <span className="text-xs text-ink-muted hidden tablet:inline">
          {readerMode === "interactive"
            ? "Living Interactive Storyboard Stage"
            : "Standard Textbook Reading Mode"}
        </span>
      </div>

      <div className="mt-6 desktop:grid desktop:grid-cols-[220px_minmax(0,1fr)_260px] desktop:gap-8">
        <aside className="hidden desktop:block">
          <Toc />
        </aside>

        <div className="min-w-0">
          {m.state === "renderError" ? (
            <ErrorAlert message={s("renderError")} />
          ) : !chapter ? (
            <ErrorAlert message={s("chapterMissing")} />
          ) : loading ? (
            <div className="max-w-reading space-y-3">
              <LoadingSkeleton count={6} />
              <SlowNetworkNote pending={loading} />
            </div>
          ) : readerMode === "interactive" ? (
            <div className="space-y-4">
              <InteractiveChapterStage
                manualId={book.id}
                chapterIndex={ci}
                chapterTitle={chapter.title}
                onClose={() => setReaderMode("read")}
              />
            </div>
          ) : (
            <article className={wideReading ? "max-w-none" : "max-w-reading"}>
              <div className="mb-4">
                <div
                  role="progressbar"
                  aria-label={s("progress")}
                  aria-valuemin={1}
                  aria-valuemax={book.pages}
                  aria-valuenow={page}
                  aria-valuetext={s("page", { n: page, total: book.pages })}
                  className="h-1 w-full rounded-surface bg-border"
                >
                  <div
                    className="h-1 rounded-surface bg-accent"
                    style={{ width: `${(page / book.pages) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {s("page", { n: page, total: book.pages })}
                </p>
              </div>

              <h2 className="font-heading text-[24px] text-ink">{chapter.title}</h2>
              <div
                ref={textRef}
                style={{ fontSize, lineHeight: 1.7 }}
                className={`mt-4 space-y-5 ${darkMode ? "text-white" : "text-ink"}`}
                onMouseUp={() => {
                  setSel(readSelection());
                  setExplanation(null);
                  setTransformedText(null);
                }}
                onTouchEnd={() =>
                  setTimeout(() => {
                    setSel(readSelection());
                    setExplanation(null);
                    setTransformedText(null);
                  }, 50)
                }
              >
                {chapter.paragraphs.map((p, i) => (
                  <p key={i} data-para={i}>
                    {renderPara(p, i)}
                  </p>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t border-border pt-4">
                {sel && (
                  <div
                    role="toolbar"
                    aria-label={s("highlight")}
                    className="reader-selection-toolbar flex flex-wrap items-center gap-1.5 p-2 bg-page-bg border border-border rounded-card shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => highlight(sel)}
                      className="btn-secondary gap-1 text-xs py-1 px-2.5"
                    >
                      <Highlighter aria-hidden size={14} />
                      {s("highlight")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openNote(sel)}
                      className="btn-secondary text-xs py-1 px-2.5"
                    >
                      {s("addNote")}
                    </button>
                    <button
                      type="button"
                      onClick={speakSelection}
                      className="btn-secondary gap-1 text-xs py-1 px-2.5"
                      title="Listen aloud to selected text"
                    >
                      <Volume2 size={14} />
                      <span>Listen Aloud</span>
                    </button>
                    <button
                      type="button"
                      disabled={transforming}
                      onClick={() => transformSelection("simplify")}
                      className="btn-secondary gap-1 text-xs py-1 px-2.5"
                      title="Simplify difficult phrases"
                    >
                      <Sparkles size={14} className="text-amber-500" />
                      <span>{transforming ? "Simplifying..." : "Simplify"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={transforming}
                      onClick={() => transformSelection("translate")}
                      className="btn-secondary gap-1 text-xs py-1 px-2.5"
                      title="Translate to your chosen Indian language"
                    >
                      <Globe size={14} className="text-blue-500" />
                      <span>Translate</span>
                    </button>
                    <Link
                      to="/learn/coach"
                      className="btn-secondary gap-1 text-xs py-1 px-2.5 inline-flex items-center"
                      title="Ask Vidura study coach about this selection"
                    >
                      <MessageSquare size={14} className="text-brand" />
                      <span>Ask Vidura</span>
                    </Link>
                  </div>
                )}

                {transformedText && (
                  <div className="rounded bg-highlight p-3 border border-border text-xs text-ink space-y-1">
                    <div className="flex justify-between font-semibold text-brand text-[11px]">
                      <span className="capitalize">{transformedText.command} Result:</span>
                      <button
                        type="button"
                        onClick={() => setTransformedText(null)}
                        className="text-ink-muted hover:text-ink font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="leading-relaxed">{transformedText.text}</p>
                  </div>
                )}
                {explanation && (
                  <p
                    role="status"
                    className="border-l-2 border-secondary bg-highlight p-3 text-ink"
                  >
                    {t(explanation)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => highlight(readSelection())}
                  onMouseDown={(e) => e.preventDefault()}
                  className="btn-secondary gap-2"
                >
                  <Highlighter aria-hidden size={18} />
                  {s("highlightSel")}
                </button>
                <p role="status" className="text-sm text-ink-muted">
                  {hint
                    ? s("selectFirst")
                    : saveState === "saving"
                      ? s("saving")
                      : saveState === "saved"
                        ? s("saved")
                        : ""}
                </p>
                {saveState === "error" && (
                  <ErrorAlert message={s("saveError")} onRetry={() => pending && save(pending)} />
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-4">
                <Link to="/active-quizzes" className="btn-primary">
                  {s("practise")}
                </Link>
                <Link to="/quiz" className="inline-flex min-h-11 items-center text-ink underline">
                  {s("retry")}
                </Link>
              </div>
            </article>
          )}
        </div>
        <aside className="hidden desktop:block">
          <h2 className="font-heading text-[18px]">{s("notes")}</h2>
          {chapterMarks.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">{s("emptyNotes")}</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {chapterMarks.map((mark) => (
                <li key={mark.id} className="rounded-surface border border-border p-3 text-sm">
                  <p>
                    <mark className="bg-highlight text-ink">{mark.text}</mark>
                  </p>
                  {mark.note && <p className="mt-2">{mark.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <BottomSheet open={tocOpen} title={s("chapters")} onClose={() => setTocOpen(false)}>
        <Toc />
      </BottomSheet>

      <BottomSheet open={notesOpen} title={s("notes")} onClose={() => setNotesOpen(false)}>
        {chapterMarks.length === 0 ? (
          <p className="text-ink-muted">{s("emptyNotes")}</p>
        ) : (
          <ul className="space-y-3">
            {chapterMarks.map((x) => (
              <li key={x.id} className="rounded-surface border border-border p-3 text-ink">
                <p className="text-sm text-ink-muted">{s("excerpt")}</p>
                <p>
                  <mark className="bg-highlight text-ink">{x.text}</mark>
                </p>
                {x.note && (
                  <p className="mt-2">
                    <span className="text-sm text-ink-muted">{s("noteLabel")}: </span>
                    {x.note}
                  </p>
                )}
                <button type="button" onClick={() => setToDelete(x)} className="btn-secondary mt-2">
                  {s("delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>

      <BottomSheet open={!!noteFor} title={s("addNote")} onClose={() => setNoteFor(null)}>
        <p className="text-ink">
          <mark className="bg-highlight text-ink">{noteFor?.text}</mark>
        </p>
        <label htmlFor="note-text" className="mt-3 block font-semibold text-ink">
          {s("noteLabel")}
        </label>
        <textarea
          id="note-text"
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="mt-1 w-full rounded-surface border border-border-control bg-surface p-2 text-ink"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (noteFor && chapter)
                save({
                  chapterId: chapter.id,
                  para: noteFor.para,
                  text: noteFor.text,
                  note: noteText.trim(),
                });
              setNoteFor(null);
            }}
          >
            {s("saveNote")}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setNoteFor(null)}>
            {s("cancel")}
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!toDelete}
        title={s("deleteTitle")}
        body={s("deleteBody")}
        confirmLabel={s("deleteYes")}
        cancelLabel={s("deleteNo")}
        onConfirm={() => {
          setMarks((xs) => xs.filter((x) => x.id !== toDelete?.id));
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />

      {toast && <Toast message={toast} onDismiss={dismiss} />}
    </div>
  );
}
