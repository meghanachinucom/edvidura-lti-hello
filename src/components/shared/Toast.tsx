import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { t } from "@/i18n";

/** Auto-dismisses after 4 s; pauses while hovered or focused. */
export function Toast({ message, onDismiss, duration = 4000 }: { message: string; onDismiss: () => void; duration?: number }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  const started = useRef(0);
  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const id = setTimeout(onDismiss, remaining.current);
    return () => { clearTimeout(id); remaining.current -= Date.now() - started.current; };
  }, [paused, onDismiss]);
  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-surface bg-ink p-3 text-surface tablet:bottom-6"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button type="button" onClick={onDismiss} aria-label={t("shared.toast.dismiss")} className="icon-btn shrink-0 text-surface">
        <X aria-hidden size={18} />
      </button>
    </div>
  );
}
