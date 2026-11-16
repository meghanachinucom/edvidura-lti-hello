import { t } from "@/i18n";

/** M4: shown on every AI draft until it is saved. */
export function DraftBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-border-control px-2 py-0.5 text-sm font-medium text-ink">
      {t("shared.draftUntilSaved")}
    </span>
  );
}
