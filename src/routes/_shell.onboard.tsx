import { useId, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CopyButton } from "@/components/shared/CopyButton";
import { moodleSettings } from "@/data/institute";
import { mockState } from "@/data/mockState";

// SH-06 Institute connect. Who may use this page is undecided (DEC-02); built exactly as specified.
export const Route = createFileRoute("/_shell/onboard")({
  head: () => ({
    meta: [
      { title: t("SH-06.title") + t("app.titleSuffix") },
      { name: "description", content: t("SH-06.step1") },
      { property: "og:title", content: t("SH-06.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SH-06.step1") },
    ],
  }),
  component: Onboard,
});

const s = (k: string, v?: Record<string, string | number>) => t(`SH-06.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

function Step({ n, title, children, disabled }: { n: number; title: string; children: ReactNode; disabled?: boolean }) {
  return (
    <li className={`rounded-surface border border-border bg-surface p-5 ${disabled ? "opacity-70" : ""}`}>
      <h2 className="font-heading text-[22px] text-ink"><span className="text-ink-muted">{s("step", { n })} · </span>{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </li>
  );
}

function Onboard() {
  const id = useId();
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [key, setKey] = useState("");
  const [nameError, setNameError] = useState(false);
  const [keyError, setKeyError] = useState(false);
  const [created, setCreated] = useState(false);
  const complete = name.trim() !== "" && issuer.trim() !== "" && key !== "";

  const create = () => {
    if (!name.trim()) { setNameError(true); return; }
    if (key !== mockState.onboard.validAdminKey) { setKeyError(true); return; }
    setKeyError(false);
    setKey(""); // never keep or show the key after entry
    setCreated(true);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeading text={s("title")} />
      <ol className="mt-6 space-y-4">
        <Step n={1} title={s("step1")}>
          <div>
            <label htmlFor={`${id}-n`} className="block font-semibold text-ink">{s("name")}</label>
            <input id={`${id}-n`} value={name} placeholder={s("namePh")}
              onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
              onBlur={() => setNameError(!name.trim())}
              aria-invalid={nameError || undefined} aria-describedby={nameError ? `${id}-ne` : undefined}
              className={`${input} ${nameError ? "border-error" : ""}`} />
            {nameError && <p id={`${id}-ne`} role="alert" className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{s("nameError")}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-i`} className="block font-semibold text-ink">{s("issuer")}</label>
            <p id={`${id}-ih`} className="text-sm text-ink-muted">{s("issuerHelp")}</p>
            <input id={`${id}-i`} type="url" inputMode="url" value={issuer} placeholder={s("issuerPh")} aria-describedby={`${id}-ih`}
              onChange={(e) => setIssuer(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-k`} className="block font-semibold text-ink">{s("key")}</label>
            <input id={`${id}-k`} type="password" autoComplete="off" value={key}
              onChange={(e) => { setKey(e.target.value); setKeyError(false); }}
              aria-invalid={keyError || undefined} aria-describedby={keyError ? `${id}-ke` : undefined}
              className={`${input} ${keyError ? "border-error" : ""}`} />
            {keyError && <p id={`${id}-ke`} role="alert" className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{s("keyError")}</p>}
          </div>
        </Step>

        <Step n={2} title={s("step2")} disabled={!complete && !created}>
          <button type="button" onClick={create} disabled={!complete} className="btn-primary disabled:opacity-60">{s("create")}</button>
        </Step>

        <Step n={3} title={s("step3")} disabled={!created}>
          {created && moodleSettings.map((m) => (
            <div key={m.key}>
              <label htmlFor={`${id}-${m.key}`} className="block font-semibold text-ink">{s(m.key)}</label>
              <div className="mt-2 flex flex-col gap-2 tablet:flex-row tablet:items-center">
                <input id={`${id}-${m.key}`} readOnly value={m.value} className="min-h-11 w-full min-w-0 rounded-surface bg-page-bg px-3 font-mono text-sm text-ink border-control" />
                <CopyButton text={m.value} label={s(m.key)} />
              </div>
            </div>
          ))}
          <details className="rounded-surface border border-border p-3">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink">{s("advanced")}</summary>
            <div className="mt-3 space-y-4">
              <p className="text-ink">{s("advancedNote")}</p>
              <div>
                <label htmlFor={`${id}-c`} className="block font-semibold text-ink">{s("clientId")}</label>
                <input id={`${id}-c`} autoComplete="off" className={input} />
              </div>
              <div>
                <label htmlFor={`${id}-d`} className="block font-semibold text-ink">{s("deploymentId")}</label>
                <input id={`${id}-d`} autoComplete="off" className={input} />
              </div>
            </div>
          </details>
        </Step>
      </ol>
    </div>
  );
}
