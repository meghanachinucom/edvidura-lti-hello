import { t } from "@/i18n";

const STEPS = ["review", "practise", "gradedRetry"] as const;

/** Review → Practise → Graded retry. No percentages, no ticks. */
export function LoopStepper({ current }: { current: 1 | 2 | 3 }) {
  const name = t(`shared.loop.${STEPS[current - 1]}`);
  return (
    <nav aria-label={t("shared.loop.label")}>
      <p className="font-medium text-ink">{t("shared.loop.stepOf", { n: current, name })}</p>
      <ol className="loop-stepper mt-2 flex flex-col gap-2 tablet:flex-row">
        {STEPS.map((s, i) => {
          const isCurrent = i + 1 === current;
          return (
            <li key={s} aria-current={isCurrent ? "step" : undefined}
              className={`loop-step relative flex min-h-11 flex-1 items-center gap-2 px-3 ${isCurrent ? "font-semibold text-accent" : "text-ink-muted"}`}>
              <span aria-hidden className={`loop-node relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${isCurrent ? "border-accent bg-accent text-primary-foreground" : "border-border-control bg-surface"}`}>{i + 1}</span>
              <span className="relative z-10 bg-page-bg px-1">{t(`shared.loop.${s}`)}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
