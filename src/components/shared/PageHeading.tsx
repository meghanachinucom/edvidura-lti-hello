import { useEffect, useRef } from "react";
import { t } from "@/i18n";

/** The page's single h1. Sets document.title and receives focus on route change. */
export function PageHeading({ titleKey, text }: { titleKey?: string; text?: string }) {
  const label = text ?? t(titleKey ?? "");
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = label + t("app.titleSuffix");
    ref.current?.focus();
  }, [label]);
  return (
    <div className="blueprint-grid rounded-surface px-3 py-2">
      <h1 ref={ref} tabIndex={-1} className="font-heading text-[28px] font-extrabold tracking-[-0.02em] leading-tight text-ink tablet:text-[36px]">
        {label}
      </h1>
      <div aria-hidden className="title-rule" />
    </div>
  );
}
