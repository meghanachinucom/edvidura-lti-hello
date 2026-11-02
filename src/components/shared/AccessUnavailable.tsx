import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "./PageHeading";

/** SH-03. Neutral "not available" page. Never confirms whether a record exists anywhere. */
/** `back` swaps the default "Back to Home" link, e.g. to "All lessons". */
export function AccessUnavailable({ back }: { back?: { to: string; label: string } } = {}) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="rounded-surface border border-border bg-surface p-6 text-center">
        <Info aria-hidden size={32} className="mx-auto text-focus-ring" />
        <div className="mt-3"><PageHeading text={t("SH-03.title")} /></div>
        <p className="mt-3 text-ink">{t("SH-03.body")}</p>
        <Link to={back?.to ?? "/launch-hub"} className="btn-primary mt-6">{back?.label ?? t("SH-03.back")}</Link>
      </div>
    </div>
  );
}
