import { useId, useRef, useState, type ReactNode } from "react";
import { PanelRight, X } from "lucide-react";
import { t } from "@/i18n";
import { useFocusTrap } from "./useFocusTrap";

/**
 * Secondary content. Desktop (1280px+): sits beside the main content.
 * Tablet and phone: behind a "Show details" button, opening as a side panel.
 */
export function TabletPanel({ title, children, main }: { title?: string; children: ReactNode; main: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const heading = title ?? t("shared.panel.title");
  useFocusTrap(ref, open, () => setOpen(false));
  return (
    <div className="desktop:grid desktop:grid-cols-[minmax(0,1fr)_300px] desktop:gap-6">
      <div className="min-w-0">
        <div className="mb-3 desktop:hidden">
          <button type="button" aria-expanded={open} onClick={() => setOpen(true)} className="btn-secondary gap-2">
            <PanelRight aria-hidden size={18} />{t("shared.panel.open")}
          </button>
        </div>
        {main}
      </div>
      <aside aria-labelledby={`${id}-d`} className="hidden rounded-surface border border-border bg-surface p-4 desktop:block">
        <h2 id={`${id}-d`} className="font-heading text-[18px] text-ink">{heading}</h2>
        <div className="mt-2">{children}</div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 desktop:hidden" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-m`} className="h-full w-full max-w-sm overflow-y-auto bg-surface-raised p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id={`${id}-m`} className="min-w-0 font-heading text-[18px] text-ink">{heading}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("shared.dialog.close")} className="icon-btn shrink-0"><X aria-hidden /></button>
            </div>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
