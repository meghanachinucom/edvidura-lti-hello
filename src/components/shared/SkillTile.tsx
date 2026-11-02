import type { ReactNode } from "react";
import { StatusDot, type StatusTone } from "./StatusDot";

export type SkillState = "missing" | "practising" | "passed";
const stateTone: Record<SkillState, StatusTone> = { missing: "attention", practising: "progress", passed: "success" };

export function SkillLegend({ labels }: { labels: Record<SkillState, ReactNode> }) {
  return <ul aria-label="Skill status legend" className="flex flex-wrap gap-4 text-sm">{(Object.keys(stateTone) as SkillState[]).map((state) => <li key={state}><StatusDot tone={stateTone[state]} label={labels[state]} /></li>)}</ul>;
}

export function SkillTile({ title, code, state, stateLabel, action }: { title: string; code: string; state: SkillState; stateLabel: ReactNode; action?: ReactNode }) {
  return <article className="rounded-surface border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-heading text-[18px] text-ink">{title}</h2><StatusDot tone={stateTone[state]} label={stateLabel} /></div><p className="mt-2 font-mono text-sm text-ink-muted">{code}</p>{action && <div className="mt-2">{action}</div>}</article>;
}
