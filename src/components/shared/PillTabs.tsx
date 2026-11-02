import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export interface PillTab { id: string; label: ReactNode; to?: string; onSelect?: () => void }

/** Pass B pill tabs: the active tab is filled accent. Items are links or toggle buttons. */
export function PillTabs({ items, active, label }: { items: PillTab[]; active: string; label: string }) {
  return (
    <div role="group" aria-label={label} className="pill-tabs">
      {items.map((x) => x.to && x.id !== active
        ? <Link key={x.id} to={x.to} className="pill-tab">{x.label}</Link>
        : <button key={x.id} type="button" aria-pressed={x.id === active} onClick={x.onSelect} className="pill-tab">{x.label}</button>)}
    </div>
  );
}
