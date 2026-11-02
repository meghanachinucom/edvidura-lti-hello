import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, List } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ebookChapters } from "@/data/ebookContent";
import type { Ebook } from "@/data/ebooks";
import { mockState } from "@/data/mockState";

const s = (k: string) => t(`LR-16.${k}`);
const r = (k: string) => t(`LR-15.${k}`);

/** LR-16: read-only. Same typography as the PeBL reader; no highlight, notes, bookmarks, listen or practice links. */
export function StandaloneReader({ book }: { book: Ebook }) {
  const m = mockState.reader;
  const chapters = ebookChapters[book.id] ?? [];
  const [ci, setCi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    if (m.state === "renderError" || m.state === "chapterMissing") { setLoading(false); return; }
    const id = setTimeout(() => setLoading(false), m.state === "slow" ? 5000 : m.state === "loading" ? 60_000 : m.loadingMs);
    return () => clearTimeout(id);
  }, [m.state, m.loadingMs]);

  const chapter = m.state === "chapterMissing" ? undefined : chapters[ci];
  const go = (n: number) => { setCi(n); setTocOpen(false); window.scrollTo({ top: 0 }); };

  const Toc = () => (
    <nav aria-label={r("chapters")} className="text-ink">
      <h2 className="font-heading text-[18px]">{r("chapters")}</h2>
      <ol className="mt-2 space-y-1">
        {chapters.map((c, i) => (
          <li key={c.id}>
            <button type="button" aria-current={i === ci ? "true" : undefined} onClick={() => go(i)}
              className={`min-h-11 w-full rounded-surface px-2 text-left ${i === ci ? "font-semibold text-accent" : ""}`}>{c.title}</button>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <div className="mx-auto w-full max-w-content px-4 py-6 desktop:max-w-[1200px]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <Link to="/manuals" className="inline-flex min-h-11 items-center gap-2 text-ink underline"><ArrowLeft aria-hidden size={18} />{s("back")}</Link>
          <PageHeading text={book.title} />
        </div>
        <button type="button" onClick={() => setTocOpen(true)} className="btn-secondary shrink-0 gap-2 desktop:hidden">
          <List aria-hidden size={18} />{r("chapters")}
        </button>
      </header>

      <div className="mt-6 desktop:grid desktop:grid-cols-[260px_minmax(0,1fr)] desktop:gap-10">
        <aside className="hidden desktop:block"><Toc /></aside>
        <div className="min-w-0">
          {m.state === "renderError" ? <ErrorAlert message={r("renderError")} /> :
            !chapter ? <ErrorAlert message={r("chapterMissing")} /> :
            loading ? <div className="max-w-reading space-y-3"><LoadingSkeleton count={6} /><SlowNetworkNote pending={loading} /></div> : (
            <article className="max-w-reading">
              <p className="mb-4 text-sm text-ink-muted">
                {s("note")}{" "}
                <Link to="/manuals/$manualId" params={{ manualId: book.id }} className="text-ink underline">{s("noteLink")}</Link>
              </p>
              <h2 className="font-heading text-[24px] text-ink">{chapter.title}</h2>
              <div className="mt-4 space-y-5 text-[18px] leading-[1.7] text-ink">
                {chapter.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <nav aria-label={s("chapterNav")} className="mt-8 flex justify-between gap-3 border-t border-border pt-4">
                <button type="button" onClick={() => go(ci - 1)} disabled={ci === 0} className="btn-secondary gap-1"><ChevronLeft aria-hidden size={18} />{s("prev")}</button>
                <button type="button" onClick={() => go(ci + 1)} disabled={ci >= chapters.length - 1} className="btn-secondary gap-1">{s("next")}<ChevronRight aria-hidden size={18} /></button>
              </nav>
            </article>
          )}
        </div>
      </div>

      <BottomSheet open={tocOpen} title={r("chapters")} onClose={() => setTocOpen(false)}><Toc /></BottomSheet>
    </div>
  );
}
