import { useId } from "react";
import { t } from "@/i18n";
import { cohortEvents } from "@/data/schoolAdmin";

/** M5 real-time cohort events. The LIVE label pulses once on load. No grade passback shown as active or confirmed. */
export function CohortEvents() {
  const id = useId();
  const s = (k: string) => t(`SA-03.${k}`);
  return (
    <section aria-labelledby={`${id}-t`} className="rounded-surface border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <h2 id={`${id}-t`} className="font-heading text-[22px] text-ink">{s("eventsHeading")}</h2>
        <span className="animate-pulse-once rounded-full border border-ink px-2 py-0.5 text-sm font-semibold text-ink">{s("live")}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {cohortEvents.map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-4 rounded-surface bg-page-bg px-3 py-2">
            <span className="min-w-0 text-ink">{e.text}</span>
            <span className="shrink-0 text-sm text-ink-muted">{e.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
