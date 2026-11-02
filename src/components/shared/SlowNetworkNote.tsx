import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { t } from "@/i18n";
import { mockState } from "@/data/mockState";

/** Appears once a pending mock action has run longer than mockState.slowAfterMs (3 s). */
export function SlowNetworkNote({ pending }: { pending: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!pending) { setShow(false); return; }
    const id = setTimeout(() => setShow(true), mockState.slowAfterMs);
    return () => clearTimeout(id);
  }, [pending]);
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
      {show && <><Clock aria-hidden size={16} className="shrink-0" />{t("shared.slow")}</>}
    </p>
  );
}
