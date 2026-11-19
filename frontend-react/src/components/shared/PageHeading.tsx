import { useEffect, useRef } from "react";
import { t } from "@/i18n";
import { useRole } from "@/components/shell/RoleContext";

/** The page's single h1. Sets document.title and receives focus on route change. */
export function PageHeading({
  titleKey,
  text,
  context,
}: {
  titleKey?: string;
  text?: string;
  context?: string;
}) {
  const { locale } = useRole();
  const label = text ?? t(titleKey ?? "");
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = label + t("app.titleSuffix");
    ref.current?.focus();
  }, [label, locale]);
  return (
    <div className="rounded-surface px-1 py-1">
      <h1
        ref={ref}
        tabIndex={-1}
        className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
      >
        {label}
      </h1>
      {context && (
        <p className="mt-1.5 max-w-reading text-sm sm:text-[15px] leading-relaxed font-normal text-slate-600">
          {context}
        </p>
      )}
      <div aria-hidden className="title-rule mt-2" />
    </div>
  );
}
