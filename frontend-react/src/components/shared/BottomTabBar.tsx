import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { t } from "@/i18n";

export interface TabItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Mobile only (up to 639px). `fixed={false}` renders in-flow for review. */
export function BottomTabBar({ items, fixed = true }: { items: TabItem[]; fixed?: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label={t("shared.tabs.label")}
      className={`border-t border-border bg-surface ${fixed ? "fixed inset-x-0 bottom-0 z-30 tablet:hidden" : ""}`}
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-15 flex-col items-center justify-center gap-1 px-1.5 text-center transition-all ${active ? "font-bold text-teal-900 bg-teal-500/12 rounded-xl py-1 shadow-xs" : "font-medium text-slate-600 hover:text-slate-900"}`}
              >
                <Icon
                  aria-hidden
                  size={20}
                  className={active ? "text-teal-700 stroke-[2.25]" : "stroke-2"}
                />
                <span
                  className={`w-full truncate text-[12px] sm:text-[13px] ${active ? "font-bold text-teal-900" : "font-medium"}`}
                >
                  {label}
                </span>
                {active && <span className="h-1 w-6 rounded-full bg-secondary" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
