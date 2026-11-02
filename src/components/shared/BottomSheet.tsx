import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { t } from "@/i18n";
import { useFocusTrap } from "./useFocusTrap";

/** Slides from the bottom on phones; centred sheet from 640px. Traps focus, Escape closes. */
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 tablet:items-center tablet:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-surface bg-surface-raised p-4 tablet:max-w-lg tablet:rounded-surface">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={id} className="min-w-0 font-heading text-[22px] text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("shared.dialog.close")} className="icon-btn shrink-0"><X aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
