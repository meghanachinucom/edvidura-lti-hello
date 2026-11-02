import { useEffect, useRef } from "react";
import { t } from "@/i18n";

/** Full-page state. `embedded` renders an h2 for the gallery so the page keeps one h1. */
export function SessionExpired({ embedded = false }: { embedded?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (embedded) return;
    document.title = t("shared.session.title") + t("app.titleSuffix");
    ref.current?.focus();
  }, [embedded]);
  const H = embedded ? "h2" : "h1";
  return (
    <div className={`flex flex-col items-center justify-center bg-page-bg px-4 text-center ${embedded ? "py-10" : "min-h-screen"}`}>
      <H ref={ref} tabIndex={-1} className="font-heading text-[28px] text-ink">{t("shared.session.title")}</H>
      <p className="mt-3 max-w-reading text-ink">{t("shared.session.body")}</p>
      <button type="button" className="btn-primary mt-6">{t("shared.session.back")}</button>
    </div>
  );
}
