import { t } from "@/i18n";

/** No shimmer under prefers-reduced-motion (handled by the skeleton utility). */
export function LoadingSkeleton({ variant = "text", count = 3 }: { variant?: "text" | "table"; count?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t("shared.loading")}</span>
      <div aria-hidden className="space-y-3">
        {Array.from({ length: count }).map((_, i) =>
          variant === "text" ? (
            <div key={i} className="skeleton h-4" style={{ width: `${90 - i * 15}%` }} />
          ) : (
            <div key={i} className="flex gap-3 border-b border-border pb-3">
              <div className="skeleton h-5 flex-[2]" />
              <div className="skeleton h-5 flex-1" />
              <div className="skeleton h-5 flex-1" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
