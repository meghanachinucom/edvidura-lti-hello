import { useId } from "react";
import { t } from "@/i18n";
import { skillGaps } from "@/data/teacherInsights";

/** M4 Who lacks what: skills with learner counts only — no names. */
export function WhoLacksWhat({ highlightedSkill }: { highlightedSkill?: string | null }) {
  const id = useId();
  const s = (k: string, v?: Record<string, string | number>) => t(`TC-01.${k}`, v);
  return (
    <section aria-labelledby={`${id}-t`} className="rounded-surface border border-border bg-surface p-4">
      <h2 id={`${id}-t`} className="font-heading text-[22px] text-ink">{s("gapsTitle")}</h2>
      <ul className="mt-4 space-y-2">
        {skillGaps.map((g) => (
          <li key={g.code} data-highlighted={highlightedSkill === g.code}
            className={`flex items-baseline justify-between gap-2 rounded-surface border px-3 py-2 ${highlightedSkill === g.code ? "border-secondary bg-highlight" : "border-transparent bg-page-bg"}`}>
            <span className="text-ink">{g.title}</span>
            <span className="shrink-0 font-semibold text-ink">{g.learners === 1 ? s("gapsCountOne") : s("gapsCount", { n: g.learners })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
