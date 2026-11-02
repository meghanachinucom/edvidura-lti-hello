import { useId, useState } from "react";
import { transitionRoles } from "@/data/preWork";
import { PercentageBar } from "@/components/shared/PercentageBar";
import { t } from "@/i18n";

export function RoleTransitionDelta() {
  const id = useId();
  const [roleId, setRoleId] = useState<string>(transitionRoles[0].id);
  const role = transitionRoles.find((item) => item.id === roleId) ?? transitionRoles[0];
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-surface border border-border bg-surface p-4">
      <h2 id={`${id}-title`} className="font-heading text-[22px] text-ink">{t("pass2.delta.title")}</h2>
      <fieldset className="mt-4 grid gap-2 tablet:grid-cols-2">
        <legend className="sr-only">{t("LR-09.role")}</legend>
        {transitionRoles.map((item) => (
          <label key={item.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border p-3 ${roleId === item.id ? "border-accent bg-page-bg" : "border-border-control"}`}>
            <input type="radio" name={`${id}-role`} value={item.id} checked={roleId === item.id} onChange={() => setRoleId(item.id)} className="size-4 accent-accent" />
            <span>{t(item.titleKey)}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-4 grid gap-4 tablet:grid-cols-2">
        {(["held", "gap"] as const).map((kind) => (
          <div key={kind} className="space-y-2">
            <p className="font-semibold text-ink">{t(`pass2.delta.${kind}`, { n: role[kind], total: role.total })}</p>
            <PercentageBar value={role[kind] / role.total * 100} />
          </div>
        ))}
      </div>
      <span className="mt-4 inline-flex rounded-full bg-highlight px-3 py-1 text-sm font-semibold text-ink">{t("pass2.delta.saved", { n: role.savedPercent })}</span>
    </section>
  );
}