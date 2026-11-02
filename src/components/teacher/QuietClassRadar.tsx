import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { questionFailRates, skillGaps } from "@/data/teacherInsights";

/**
 * M4 Quiet Class Radar: item fail rates as bars. Hover or focus a bar to see
 * the exact percentage. Counts and rates only — never learner names.
 */
export function QuietClassRadar({ onSkillHighlight }: { onSkillHighlight?: (code: string | null) => void }) {
  const id = useId();
  const s = (k: string, v?: Record<string, string | number>) => t(`TC-01.${k}`, v);
  return (
    <section aria-labelledby={`${id}-t`} className="rounded-surface border border-border bg-surface p-4">
      <h2 id={`${id}-t`} className="font-heading text-[22px] text-ink">{s("radarTitle")}</h2>
      <p className="mt-1 text-sm text-ink-muted">{s("radarCaption")}</p>
      <ul className="mt-4 space-y-3">
        {questionFailRates.map((q) => (
          <li key={q.id} className="group/radar" onMouseEnter={() => onSkillHighlight?.(q.skillCode)}
            onMouseLeave={() => onSkillHighlight?.(null)} onFocus={() => onSkillHighlight?.(q.skillCode)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onSkillHighlight?.(null); }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink">{q.label}</span>
            </div>
            <div
              tabIndex={0}
              role="img"
              aria-label={s("radarBar", { label: q.label, pct: q.failRate })}
              title={s("radarPct", { pct: q.failRate })}
              className="group mt-1 h-6 w-full rounded-surface bg-page-bg outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="flex h-full items-center rounded-surface bg-accent px-2" style={{ width: `${q.failRate}%` }}>
                <span className="text-sm font-semibold text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  {s("radarPct", { pct: q.failRate })}
                </span>
              </div>
            </div>
            <div className="mt-1 flex min-h-8 flex-wrap items-center gap-x-3 text-sm invisible group-hover/radar:visible group-focus-within/radar:visible">
              <span className="font-semibold text-accent">{skillGaps.find((skill) => skill.code === q.skillCode)?.title}</span>
              <Link to="/teacher/dct" className="inline-flex min-h-8 items-center text-secondary underline">{t("pass2.microDrill")}</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
