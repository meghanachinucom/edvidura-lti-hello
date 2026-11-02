import { XCircle } from "lucide-react";
import { t } from "@/i18n";

/** Plain message only. Never error codes, stack traces or JSON. */
export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-surface border-l-4 border-error bg-surface p-3 text-ink tablet:flex-row tablet:items-center">
      <p className="flex min-w-0 flex-1 items-start gap-3">
        <XCircle aria-hidden size={20} className="mt-0.5 shrink-0 text-error" />
        <span><span className="sr-only">{t("shared.status.error")}: </span>{message}</span>
      </p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-secondary shrink-0">{t("shared.error.tryAgain")}</button>}
    </div>
  );
}
