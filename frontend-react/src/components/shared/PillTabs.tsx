import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export interface PillTab {
  id: string;
  label: ReactNode;
  to?: string;
  onSelect?: () => void;
}

export function PillTabs({
  items,
  active,
  label,
}: {
  items: PillTab[];
  active: string;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2.5">
      {items.map((item) => {
        const selected = item.id === active;
        const className = `inline-flex min-h-12 items-center rounded-full border-2 px-5 py-2.5 text-sm sm:text-base transition-all ${
          selected
            ? "border-secondary bg-secondary text-white font-black shadow-md ring-2 ring-secondary/30 scale-102"
            : "border-border-control/70 bg-surface text-ink font-bold hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
        }`;
        return item.to && !selected ? (
          <Link key={item.id} to={item.to} className={className}>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={item.onSelect}
            className={className}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
