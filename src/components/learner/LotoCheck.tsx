import { useId, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { lotoSteps, updateLotoSteps } from "@/data/preWork";
import { t } from "@/i18n";

export function LotoCheck() {
  const id = useId();
  const [checked, setChecked] = useState<boolean[]>(lotoSteps.map(() => false));
  const ready = checked.every(Boolean);
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-surface border border-border bg-surface p-4">
      <h2 id={`${id}-title`} className="font-heading text-[22px] text-ink">{t("pass2.loto.title")}</h2>
      <ol className="mt-4 space-y-2">
        {lotoSteps.map((step, index) => {
          const locked = checked.slice(0, index).some((value) => !value);
          return (
            <li key={step} className={`flex min-h-11 items-center gap-3 rounded-control px-3 py-2 ${locked ? "text-ink-muted" : "bg-page-bg text-ink"}`}>
              <Checkbox id={`${id}-${step}`} checked={Boolean(checked[index])} disabled={locked}
                onCheckedChange={(value) => setChecked((current) => updateLotoSteps(current, index, value === true))}
                className="size-5 focus-visible:outline-3 focus-visible:outline-secondary focus-visible:outline-offset-2" />
              <label htmlFor={`${id}-${step}`} className="min-w-0 cursor-pointer">{index + 1}. {t(`pass2.loto.${step}`)}</label>
            </li>
          );
        })}
      </ol>
      <div role="status" className="mt-3 min-h-8">
        {ready && <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-primary-foreground"><ShieldCheck aria-hidden size={16} />{t("pass2.loto.ready")}</span>}
      </div>
    </section>
  );
}