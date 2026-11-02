import type { ReactNode } from "react";

/** Minimal, safe Markdown preview: headings, bullet/numbered lists, paragraphs, **bold**. No HTML is injected. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

export function MarkdownPreview({ source }: { source: string }) {
  const blocks = source.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3 text-ink">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const h = /^(#{1,3})\s+(.*)$/.exec(lines[0]!);
        if (h && lines.length === 1) {
          const cls = h[1]!.length === 1 ? "font-heading text-[22px]" : "font-heading text-[18px]";
          return <p key={i} role="heading" aria-level={h[1]!.length + 2} className={cls}>{inline(h[2]!)}</p>;
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return <ul key={i} className="ml-5 list-disc space-y-1">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>)}</ul>;
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return <ol key={i} className="ml-5 list-decimal space-y-1">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}</ol>;
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>;
      })}
    </div>
  );
}
