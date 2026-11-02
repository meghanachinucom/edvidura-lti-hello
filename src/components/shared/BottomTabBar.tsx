import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { t } from "@/i18n";

export interface TabItem { to: string; label: string; icon: LucideIcon }

/** Mobile only (up to 639px). `fixed={false}` renders in-flow for review. */
export function BottomTabBar({ items, fixed = true }: { items: TabItem[]; fixed?: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label={t("shared.tabs.label")} className={`border-t border-border bg-surface ${fixed ? "fixed inset-x-0 bottom-0 z-30 tablet:hidden" : ""}`}>
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link to={to} aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-center text-sm ${active ? "font-semibold text-accent" : "text-ink-muted"}`}>
                <Icon aria-hidden size={20} />
                <span className="w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
