import type { ReactNode } from "react";

export type StatusTone = "success" | "progress" | "attention" | "neutral";
const tones: Record<StatusTone, string> = {
  success: "bg-success", progress: "bg-secondary", attention: "bg-warning", neutral: "bg-outline-variant",
};

export function StatusDot({ tone, label }: { tone: StatusTone; label: ReactNode }) {
  return <span className="inline-flex items-center gap-2 text-ink"><span aria-hidden className={`size-2.5 shrink-0 rounded-full ${tones[tone]}`} />{label}</span>;
}
