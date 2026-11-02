import { useEffect, useRef } from "react";
import { t } from "@/i18n";
import { useRole } from "@/components/shell/RoleContext";

/** The page's single h1. Sets document.title and receives focus on route change. */
export function PageHeading({ titleKey, text, context }: { titleKey?: string; text?: string; context?: string }) {
  const { locale } = useRole();
  const label = text ?? t(titleKey ?? "");
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = label + t("app.titleSuffix");
    ref.current?.focus();
  }, [label, locale]);
  return (
    <div className="blueprint-grid rounded-surface px-3 py-2">
      <h1 ref={ref} tabIndex={-1} className="font-heading text-[28px] font-extrabold tracking-[-0.02em] leading-tight text-ink">
        {label}
      </h1>
      {context && <p className="mt-2 max-w-reading text-ink-muted">{context}</p>}
      <div aria-hidden className="title-rule" />
    </div>
  );
}
