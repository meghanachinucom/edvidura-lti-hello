import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-8">
      <PageHeading titleKey={titleKey} />
      <p className="mt-3 max-w-reading text-ink-muted">{t("app.later")}</p>
    </div>
  );
}
