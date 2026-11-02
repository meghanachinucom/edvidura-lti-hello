import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Highlighter, List, NotebookPen, Volume2 } from "lucide-react";
import { t } from "@/i18n";
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

const s = (k: string, v?: Record<string, string | number>) => t(`LR-15.${k}`, v);

interface Mark { id: number; chapterId: string; para: number; text: string; note: string }
interface Sel { para: number; text: string }

/** Reading-first: quiet chrome, 68ch column, tools kept outside the text. In-memory only. */
export function EbookReader({ book }: { book: Ebook }) {
  const m = mockState.reader;
  const chapters = ebookChapters[book.id] ?? [];
  const startPage = book.currentPage ?? 1;
  const initial = chapters.reduce((acc, c, i) => (c.startPage <= startPage ? i : acc), 0);
  const [ci, setCi] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
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
  const textRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (m.state === "renderError" || m.state === "chapterMissing") { setLoading(false); return; }
    const id = setTimeout(() => {
      setLoading(false);
      if (book.currentPage) setToast(s("resume", { n: book.currentPage }));
    }, m.state === "slow" ? 5000 : m.state === "loading" ? 60_000 : m.loadingMs);
    return () => clearTimeout(id);
  }, [m.state, m.loadingMs, book.currentPage]);

  const chapter: Chapter | undefined = m.state === "chapterMissing" ? undefined : chapters[ci];
  const page = chapter ? Math.max(chapter.startPage, ci === initial ? startPage : chapter.startPage) : 1;
  const bookmarked = bookmarks.includes(page);

  useEffect(() => {
    setSpeechAvailable("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  }, []);
  useEffect(() => {
    setSpeaking(false); setExplanation(null);
    return () => {
      if (utterance.current) {
        utterance.current.onend = null; utterance.current.onerror = null;
        utterance.current = null;
        window.speechSynthesis?.cancel();
      }
    };
  }, [ci, book.id]);
  const listen = () => {
    if (!speechAvailable || !chapter) return;
    if (speaking) {
      if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; }
      utterance.current = null; window.speechSynthesis.cancel(); setSpeaking(false);
      return;
    }
    const next = new SpeechSynthesisUtterance([chapter.title, ...chapter.paragraphs].join("\n\n"));
    next.lang = "en-IN";
    const finish = () => { if (utterance.current === next) { utterance.current = null; setSpeaking(false); } };
    next.onend = finish; next.onerror = finish;
    utterance.current = next; setSpeaking(true);
    try { window.speechSynthesis.speak(next); } catch { finish(); }
  };

  const readSelection = (): Sel | null => {
    const ws = window.getSelection();
    const text = ws?.toString().trim();
    if (!ws || !text || !textRef.current) return null;
    const p = (ws.anchorNode?.parentElement)?.closest<HTMLElement>("[data-para]");
    if (!p || !textRef.current.contains(p)) return null;
    return { para: Number(p.dataset["para"]), text };
  };

  const save = (item: Omit<Mark, "id">) => {
    setSaveState("saving"); setPending(item);
    setTimeout(() => {
      if (m.save === "error") { setSaveState("error"); return; }
      setMarks((xs) => [...xs, { ...item, id: Date.now() }]);
      setPending(null); setSaveState("saved");
    }, m.savingMs);
  };
  const highlight = (x: Sel | null) => {
    if (!x || !chapter) { setHint(true); return; }
    setHint(false); setSel(null); window.getSelection()?.removeAllRanges();
    save({ chapterId: chapter.id, para: x.para, text: x.text, note: "" });
  };
  const openNote = (x: Sel | null) => {
    if (!x) { setHint(true); return; }
    setHint(false); setSel(null); setNoteFor(x); setNoteText("");
  };
  const toggleBookmark = () => {
    setBookmarks((b) => (bookmarked ? b.filter((p) => p !== page) : [...b, page]));
    setToast(bookmarked ? s("bookmarkRemoved") : s("bookmarkAdded"));
  };
  const go = (n: number) => { setCi(n); setSel(null); window.scrollTo({ top: 0 }); };

  const chapterMarks = marks.filter((x) => x.chapterId === chapter?.id);

  const Toc = () => (
    <div className="space-y-6 text-ink">
      <nav aria-label={s("chapters")}>
        <h2 className="font-heading text-[18px]">{s("chapters")}</h2>
        <ol className="mt-2 space-y-1">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button type="button" aria-current={i === ci ? "true" : undefined} onClick={() => { go(i); setTocOpen(false); }}
                className={`reader-chapter min-h-11 w-full rounded-surface px-2 text-left ${i === ci ? "font-semibold text-accent" : ""}`}>{c.title}</button>
            </li>
          ))}
        </ol>
      </nav>
      <section>
        <h2 className="font-heading text-[18px]">{s("bookmarks")}</h2>
        {bookmarks.length === 0 ? <p className="mt-2 text-ink-muted">{s("noBookmarks")}</p> : (
          <ul className="mt-2 space-y-1">{bookmarks.map((p) => <li key={p}>{s("page", { n: p, total: book.pages })}</li>)}</ul>
        )}
      </section>
    </div>
  );

  const renderPara = (text: string, idx: number) => {
    const hl = chapterMarks.find((x) => x.para === idx && text.includes(x.text));
    if (!hl) return text;
    const at = text.indexOf(hl.text);
    return <>{text.slice(0, at)}<mark className="bg-highlight text-ink">{hl.text}</mark>{text.slice(at + hl.text.length)}</>;
  };

  return (
    <div className={`mx-auto w-full max-w-content px-4 py-6 desktop:max-w-[1400px] ${darkMode ? "reader-dark rounded-surface" : ""}`}>
      <header className="space-y-3 border-b border-border pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <PageHeading text={book.title} />
            <p className="text-sm text-ink-muted">{s("edition")}</p>
          </div>
          <button type="button" onClick={() => setTocOpen(true)} className="btn-secondary shrink-0 gap-2 desktop:hidden">
            <List aria-hidden size={18} />{s("chapters")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => go(ci - 1)} disabled={ci === 0 || !chapter} className="btn-secondary gap-1"><ChevronLeft aria-hidden size={18} />{s("prev")}</button>
          <button type="button" onClick={() => go(ci + 1)} disabled={ci >= chapters.length - 1 || !chapter} className="btn-secondary gap-1">{s("next")}<ChevronRight aria-hidden size={18} /></button>
          <button type="button" aria-pressed={bookmarked} onClick={toggleBookmark} disabled={!chapter || loading} className="btn-secondary gap-2">
            {bookmarked ? <BookmarkCheck aria-hidden size={18} /> : <Bookmark aria-hidden size={18} />}{s("bookmark")}
          </button>
          <button type="button" onClick={() => setNotesOpen(true)} className="btn-secondary gap-2"><NotebookPen aria-hidden size={18} />{s("notes")}</button>
          <Button type="button" variant="ghost" onClick={listen} disabled={!speechAvailable || !chapter || loading}
            aria-pressed={speaking} aria-describedby={!speechAvailable ? "speech-unavailable" : undefined} className="btn-secondary learning-control h-auto">
            {speaking ? <span aria-hidden className="speech-equaliser"><span /><span /><span /></span> : <Volume2 aria-hidden size={18} />}
            {t(`pass3.reader.${speaking ? "stop" : "listen"}`)}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">{s("fontSize")}<input type="range" min={16} max={24} step={2} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} aria-label={s("fontSize")} /></label>
          <button type="button" aria-pressed={darkMode} onClick={() => setDarkMode((value) => !value)} className="btn-secondary">{s(darkMode ? "lightMode" : "darkMode")}</button>
          <button type="button" aria-pressed={wideReading} onClick={() => setWideReading((value) => !value)} className="btn-secondary">{s(wideReading ? "narrowWidth" : "wideWidth")}</button>
        </div>
        {!speechAvailable && <p id="speech-unavailable" className="text-sm text-ink-muted">{t("pass3.reader.unavailable")}</p>}
      </header>

      <div className="mt-6 desktop:grid desktop:grid-cols-[220px_minmax(0,1fr)_260px] desktop:gap-8">
        <aside className="hidden desktop:block"><Toc /></aside>

        <div className="min-w-0">
          {m.state === "renderError" ? <ErrorAlert message={s("renderError")} /> :
            !chapter ? <ErrorAlert message={s("chapterMissing")} /> :
            loading ? <div className="max-w-reading space-y-3"><LoadingSkeleton count={6} /><SlowNetworkNote pending={loading} /></div> : (
            <article className={wideReading ? "max-w-none" : "max-w-reading"}>
              <div className="mb-4">
                <div role="progressbar" aria-label={s("progress")} aria-valuemin={1} aria-valuemax={book.pages} aria-valuenow={page} aria-valuetext={s("page", { n: page, total: book.pages })}
                  className="h-1 w-full rounded-surface bg-border">
                  <div className="h-1 rounded-surface bg-accent" style={{ width: `${(page / book.pages) * 100}%` }} />
                </div>
                <p className="mt-1 text-sm text-ink-muted">{s("page", { n: page, total: book.pages })}</p>
              </div>

              <h2 className="font-heading text-[24px] text-ink">{chapter.title}</h2>
              <div ref={textRef} style={{ fontSize, lineHeight: 1.7 }} className={`mt-4 space-y-5 ${darkMode ? "text-white" : "text-ink"}`}
                onMouseUp={() => { setSel(readSelection()); setExplanation(null); }} onTouchEnd={() => setTimeout(() => { setSel(readSelection()); setExplanation(null); }, 50)}>
                {chapter.paragraphs.map((p, i) => <p key={i} data-para={i}>{renderPara(p, i)}</p>)}
              </div>

              <div className="mt-6 space-y-2 border-t border-border pt-4">
                {sel && (
                  <div role="toolbar" aria-label={s("highlight")} className="reader-selection-toolbar flex flex-wrap gap-2">
                    <button type="button" onClick={() => highlight(sel)} className="btn-secondary gap-2"><Highlighter aria-hidden size={18} />{s("highlight")}</button>
                    <button type="button" onClick={() => openNote(sel)} className="btn-secondary">{s("addNote")}</button>
                    <Button type="button" variant="ghost" className="btn-secondary learning-control h-auto whitespace-normal"
                      onClick={() => setExplanation(explanationFor(sel.text) ?? "pass3.reader.missing")}>{t("pass3.reader.explain")}</Button>
                  </div>
                )}
                {explanation && <p role="status" className="border-l-2 border-secondary bg-highlight p-3 text-ink">{t(explanation)}</p>}
                <button type="button" onClick={() => highlight(readSelection())} onMouseDown={(e) => e.preventDefault()} className="btn-secondary gap-2">
                  <Highlighter aria-hidden size={18} />{s("highlightSel")}
                </button>
                <p role="status" className="text-sm text-ink-muted">
                  {hint ? s("selectFirst") : saveState === "saving" ? s("saving") : saveState === "saved" ? s("saved") : ""}
                </p>
                {saveState === "error" && <ErrorAlert message={s("saveError")} onRetry={() => pending && save(pending)} />}
              </div>

              <div className="mt-6 flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-4">
                <Link to="/active-quizzes" className="btn-primary">{s("practise")}</Link>
                <Link to="/quiz" className="inline-flex min-h-11 items-center text-ink underline">{s("retry")}</Link>
              </div>
            </article>
          )}
        </div>
        <aside className="hidden desktop:block">
          <h2 className="font-heading text-[18px]">{s("notes")}</h2>
          {chapterMarks.length === 0 ? <p className="mt-2 text-sm text-ink-muted">{s("emptyNotes")}</p> : <ul className="mt-2 space-y-3">{chapterMarks.map((mark) => <li key={mark.id} className="rounded-surface border border-border p-3 text-sm"><p><mark className="bg-highlight text-ink">{mark.text}</mark></p>{mark.note && <p className="mt-2">{mark.note}</p>}</li>)}</ul>}
        </aside>
      </div>

      <BottomSheet open={tocOpen} title={s("chapters")} onClose={() => setTocOpen(false)}><Toc /></BottomSheet>

      <BottomSheet open={notesOpen} title={s("notes")} onClose={() => setNotesOpen(false)}>
        {chapterMarks.length === 0 ? <p className="text-ink-muted">{s("emptyNotes")}</p> : (
          <ul className="space-y-3">
            {chapterMarks.map((x) => (
              <li key={x.id} className="rounded-surface border border-border p-3 text-ink">
                <p className="text-sm text-ink-muted">{s("excerpt")}</p>
                <p><mark className="bg-highlight text-ink">{x.text}</mark></p>
                {x.note && <p className="mt-2"><span className="text-sm text-ink-muted">{s("noteLabel")}: </span>{x.note}</p>}
                <button type="button" onClick={() => setToDelete(x)} className="btn-secondary mt-2">{s("delete")}</button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>

      <BottomSheet open={!!noteFor} title={s("addNote")} onClose={() => setNoteFor(null)}>
        <p className="text-ink"><mark className="bg-highlight text-ink">{noteFor?.text}</mark></p>
        <label htmlFor="note-text" className="mt-3 block font-semibold text-ink">{s("noteLabel")}</label>
        <textarea id="note-text" rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)}
          className="mt-1 w-full rounded-surface border border-border-control bg-surface p-2 text-ink" />
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-primary" onClick={() => { if (noteFor && chapter) save({ chapterId: chapter.id, para: noteFor.para, text: noteFor.text, note: noteText.trim() }); setNoteFor(null); }}>{s("saveNote")}</button>
          <button type="button" className="btn-secondary" onClick={() => setNoteFor(null)}>{s("cancel")}</button>
        </div>
      </BottomSheet>

      <ConfirmDialog open={!!toDelete} title={s("deleteTitle")} body={s("deleteBody")} confirmLabel={s("deleteYes")} cancelLabel={s("deleteNo")}
        onConfirm={() => { setMarks((xs) => xs.filter((x) => x.id !== toDelete?.id)); setToDelete(null); }} onCancel={() => setToDelete(null)} />

      {toast && <Toast message={toast} onDismiss={dismiss} />}
    </div>
  );
}
