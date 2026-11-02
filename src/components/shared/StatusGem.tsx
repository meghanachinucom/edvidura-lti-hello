import type { ReactNode } from "react";

export type GemTone = "done" | "synced" | "progress" | "attention" | "missed" | "notStarted";
const TONE: Record<GemTone, string> = {
  done: "bg-accent", synced: "bg-tertiary-container", progress: "bg-secondary-container",
  attention: "bg-gem-warning", missed: "bg-error", notStarted: "bg-outline-variant",
};

/** 10px status gem; the status text is always shown beside it. */
export function StatusGem({ tone, children }: { tone: GemTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`status-gem ${TONE[tone]}`} />
      <span>{children}</span>
    </span>
  );
}
