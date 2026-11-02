import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export interface PillTab { id: string; label: ReactNode; to?: string; onSelect?: () => void }

export function PillTabs({ items, active, label }: { items: PillTab[]; active: string; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = item.id === active;
        const className = `inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold ${selected ? "border-secondary bg-secondary text-white" : "border-border-control bg-surface text-ink hover:bg-highlight"}`;
        return item.to && !selected
          ? <Link key={item.id} to={item.to} className={className}>{item.label}</Link>
          : <button key={item.id} type="button" aria-pressed={selected} onClick={item.onSelect} className={className}>{item.label}</button>;
      })}
    </div>
  );
}
