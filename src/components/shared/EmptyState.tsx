import type { ReactNode } from "react";

export function EmptyState({ title, help, action, headingLevel = 2 }: { title: string; help: string; action?: ReactNode; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="rounded-surface border border-border bg-surface p-6 text-center">
      <H className="font-heading text-[18px] text-ink">{title}</H>
      <p className="mx-auto mt-2 max-w-reading text-ink-muted">{help}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
