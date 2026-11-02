import { useId, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { coachShortcuts } from "@/data/coach";
import { mockState } from "@/data/mockState";

// TC-13 Coach shortcuts. Max 6; no per-learner targeting or scheduling.
export const Route = createFileRoute("/_shell/teacher/coach/shortcuts")({
  head: () => ({
    meta: [
      { title: t("TC-13.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-13.lead") },
      { property: "og:title", content: t("TC-13.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-13.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-13.${k}`, v);
const MAX = 6;
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
interface Chip { id: string; label: string; prompt: string }

function Err({ id, text }: { id: string; text: string }) {
  return <p id={id} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{text}</p>;
}

function Page() {
  const id = useId();
  const [chips, setChips] = useState<Chip[]>(mockState.teacher.shortcuts === "empty" ? [] : coachShortcuts);
  const [editing, setEditing] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [msg, setMsg] = useState<null | "limit" | "saved">(null);
  const [next, setNext] = useState(1);

  const update = (cid: string, patch: Partial<Chip>) => { setChips(chips.map((c) => (c.id === cid ? { ...c, ...patch } : c))); setMsg(null); };
  const add = () => {
    if (chips.length >= MAX) { setMsg("limit"); return; }
    const cid = `new-${next}`; setNext(next + 1);
    setChips([...chips, { id: cid, label: "", prompt: "" }]); setEditing(cid); setMsg(null);
  };
  const save = () => {
    const bad = chips.find((c) => !c.label.trim() || !c.prompt.trim());
    if (bad) {
      setShowErrors(true); setEditing(bad.id);
      setTimeout(() => document.getElementById(`${id}-${bad.id}-${bad.label.trim() ? "p" : "l"}`)?.focus(), 0);
      return;
    }
    setShowErrors(false); setEditing(null); setMsg("saved");
  };

  return (
    <div className="mx-auto w-full max-w-reading space-y-6 px-4 py-8">
      <div>
        <PageHeading text={s("title")} />
        <p className="mt-2 text-ink">{s("helper")}</p>
      </div>
      <p className="text-ink-muted" aria-live="polite">{s("counter", { n: chips.length })}</p>

      {chips.length === 0 ? <EmptyState title={s("empty")} help="" /> : (
        <ul className="space-y-3">
          {chips.map((c) => {
            const lErr = showErrors && !c.label.trim();
            const pErr = showErrors && !c.prompt.trim();
            return (
              <li key={c.id} className="rounded-surface border border-border bg-surface p-4">
                {editing === c.id ? (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor={`${id}-${c.id}-l`} className="block font-semibold text-ink">{s("label")}</label>
                      <input id={`${id}-${c.id}-l`} value={c.label} onChange={(e) => update(c.id, { label: e.target.value })}
                        aria-invalid={lErr || undefined} aria-describedby={lErr ? `${id}-${c.id}-le` : undefined} className={`${input} ${lErr ? "border-error" : ""}`} />
                      {lErr && <Err id={`${id}-${c.id}-le`} text={s("labelError")} />}
                    </div>
                    <div>
                      <label htmlFor={`${id}-${c.id}-p`} className="block font-semibold text-ink">{s("prompt")}</label>
                      <textarea id={`${id}-${c.id}-p`} rows={2} value={c.prompt} onChange={(e) => update(c.id, { prompt: e.target.value })}
                        aria-invalid={pErr || undefined} aria-describedby={pErr ? `${id}-${c.id}-pe` : undefined} className={`${input} py-2 ${pErr ? "border-error" : ""}`} />
                      {pErr && <Err id={`${id}-${c.id}-pe`} text={s("promptError")} />}
                    </div>
                    <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>{s("done")}</button>
                  </div>
                ) : (
                  <dl className="space-y-1 text-ink">
                    <div><dt className="text-sm font-semibold text-ink-muted">{s("label")}</dt><dd>{c.label || "—"}</dd></div>
                    <div><dt className="text-sm font-semibold text-ink-muted">{s("prompt")}</dt><dd>{c.prompt || "—"}</dd></div>
                  </dl>
                )}
                {editing !== c.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" aria-label={`${s("edit")}: ${c.label}`} onClick={() => setEditing(c.id)}>{s("edit")}</button>
                    <button type="button" className="btn-secondary" aria-label={`${s("remove")}: ${c.label}`}
                      onClick={() => { setChips(chips.filter((x) => x.id !== c.id)); setMsg(null); }}>{s("remove")}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showErrors && <StatusBanner variant="error">{s("fixErrors")}</StatusBanner>}
      {msg === "limit" && <StatusBanner variant="warning">{s("limit")}</StatusBanner>}
      {msg === "saved" && <StatusBanner variant="success">{s("saved")}</StatusBanner>}

      <div className="flex flex-col gap-2 tablet:flex-row">
        <button type="button" className="btn-secondary" onClick={add}>{s("add")}</button>
        <button type="button" className="btn-primary" onClick={save}>{s("save")}</button>
      </div>
    </div>
  );
}
