import { useEffect, useRef, type ReactNode } from "react";
import { t } from "@/i18n";
import { useRole } from "@/components/shell/RoleContext";

export interface PageHeadingProps {
  titleKey?: string;
  text?: string;
  context?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** The page's single unified h1 heading. Sets document.title and receives focus on route change. */
export function PageHeading({
  titleKey,
  text,
  context,
  subtitle,
  children,
  action,
  className = "",
}: PageHeadingProps) {
  const { locale } = useRole();
  const label = text ?? t(titleKey ?? "");
  const desc = context ?? subtitle ?? children;
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = label + t("app.titleSuffix");
    ref.current?.focus();
  }, [label, locale]);

  const headingBlock = (
    <div className={`flex flex-col min-w-0 ${className}`}>
      <h1
        ref={ref}
        tabIndex={-1}
        className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-ink"
      >
        {label}
      </h1>
      {desc && (
        <p className="mt-1 max-w-reading text-xs sm:text-sm leading-relaxed font-normal text-ink-muted">
          {desc}
        </p>
      )}
      <div aria-hidden className="title-rule mt-2.5" />
    </div>
  );

  if (action) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        {headingBlock}
        <div className="flex items-center gap-2 shrink-0">{action}</div>
      </div>
    );
  }

  return headingBlock;
}

