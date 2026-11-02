import type { ReactNode } from "react";
import { StatusDot, type StatusTone } from "./StatusDot";

export function StatusPill({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <span className="inline-flex min-h-8 items-center rounded-full border border-border-control bg-surface px-3 py-1 text-sm"><StatusDot tone={tone} label={children} /></span>;
}
