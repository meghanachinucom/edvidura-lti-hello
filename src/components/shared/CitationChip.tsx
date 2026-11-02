import { useState } from "react";

export function CitationChip({ lesson, section }: { lesson: string; section: string }) {
  const [open, setOpen] = useState(false);
  return <span className="group relative inline-block"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="min-h-11 px-1 text-secondary underline underline-offset-4">{lesson}</button><span role="note" className={`absolute bottom-full left-0 z-10 mb-1 w-56 rounded-surface border border-border bg-surface-raised p-3 text-left shadow-sm ${open ? "block" : "hidden group-hover:block group-focus-within:block"}`}><span className="block font-semibold text-ink">{lesson}</span><span className="block text-sm text-ink-muted">{section}</span></span></span>;
}
