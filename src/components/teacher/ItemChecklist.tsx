import { t } from "@/i18n";

/** Static instructor item-quality checklist ("Before you apply" / "Before you save"). */
export function ItemChecklist({ ns }: { ns: "TC-08" | "TC-07" | "TC-09" }) {
  return (
    <aside aria-labelledby={`${ns}-check`} className="rounded-surface border border-border bg-surface p-4">
      <h2 id={`${ns}-check`} className="font-heading text-[18px] text-ink">{t(`${ns}.checkTitle`)}</h2>
      <ul className="mt-2 ml-5 list-disc space-y-1 text-ink">
        {[0, 1, 2, 3, 4].map((i) => <li key={i}>{t(`${ns}.check.${i}`)}</li>)}
      </ul>
    </aside>
  );
}
