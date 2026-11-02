import { useId, useRef } from "react";
import { useFocusTrap } from "./useFocusTrap";

export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: {
  open: boolean; title: string; body: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useFocusTrap(ref, open, onCancel);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={`${id}-b`} className="w-full max-w-md rounded-surface bg-surface-raised p-5">
        <h2 id={`${id}-t`} className="font-heading text-[22px] text-ink">{title}</h2>
        <p id={`${id}-b`} className="mt-2 text-ink">{body}</p>
        <div className="mt-5 flex flex-row justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="btn-primary">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
