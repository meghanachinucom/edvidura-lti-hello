import { useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { MarkdownPreview } from "@/components/teacher/MarkdownPreview";
import { ItemChecklist } from "@/components/teacher/ItemChecklist";
import { DraftBadge } from "@/components/teacher/DraftBadge";
import { remediationDraft } from "@/data/aiDrafts";
import { skills } from "@/data/skills";
import { mockState } from "@/data/mockState";

// TC-09 Remediation. No learner names, grading or automatic assignment.
export const Route = createFileRoute("/_shell/teacher/ai/remediation")({
  head: () => ({
    meta: [
      { title: t("TC-09.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-09.lead") },
      { property: "og:title", content: t("TC-09.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-09.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-09.${k}`);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

function Page() {
  const id = useId();
  const m = mockState.teacher.remediation;
  const [skill, setSkill] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<null | "saved" | "draftError" | "saveError">(null);
  const has = body.trim().length > 0;

  const generate = () => {
    setDrafting(true); setMsg(null);
    setTimeout(() => {
      setDrafting(false);
      if (m.draft === "error") { setMsg("draftError"); return; }
      setTitle(remediationDraft.title); setBody(remediationDraft.body);
    }, m.draftingMs);
  };
  const save = () => {
    setSaving(true); setMsg(null);
    setTimeout(() => { setSaving(false); setMsg(m.save === "error" ? "saveError" : "saved"); }, 800);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-28 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      <div className="grid gap-6 tablet:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-s`} className="block font-semibold text-ink">{s("skills")}</label>
            <p id={`${id}-sh`} className="text-sm text-ink-muted">{s("lead")}</p>
            <select id={`${id}-s`} value={skill} aria-describedby={`${id}-sh`} onChange={(e) => setSkill(e.target.value)} className={input}>
              <option value="">{s("choose")}</option>
              {skills.map((k) => <option key={k.code} value={k.code}>{k.title}</option>)}
            </select>
          </div>
          <button type="button" className="btn-secondary" onClick={generate} disabled={!skill || drafting}>{s("generate")}</button>
          <p role="status" className="text-ink">{drafting ? s("drafting") : ""}</p>
          <ItemChecklist ns="TC-09" />
        </div>
        <section aria-labelledby={`${id}-d`} className="space-y-4 rounded-surface border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${id}-d`} className="font-heading text-[22px] text-ink">{s("draftHeading")}</h2>
            {has && msg !== "saved" && <DraftBadge />}
          </div>
          {!has ? <p className="text-ink-muted">{s("empty")}</p> : (
            <>
              <MarkdownPreview source={body} />
              <div>
                <label htmlFor={`${id}-t`} className="block font-semibold text-ink">{s("fTitle")}</label>
                <input id={`${id}-t`} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
              </div>
              <div>
                <label htmlFor={`${id}-b`} className="block font-semibold text-ink">{s("body")}</label>
                <textarea id={`${id}-b`} rows={12} value={body} onChange={(e) => setBody(e.target.value)} className={`${input} py-2 font-mono`} />
              </div>
              <AITrustNote audience="instructor" sources={remediationDraft.sources} />
            </>
          )}
        </section>
      </div>
      {msg === "draftError" && <ErrorAlert message={s("draftError")} onRetry={generate} />}
      {msg === "saveError" && <ErrorAlert message={s("saveError")} />}
      {msg === "saved" && <StatusBanner variant="success">{s("saved")}</StatusBanner>}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-border bg-surface p-3 tablet:static tablet:border-0 tablet:bg-transparent tablet:p-0">
        <button type="button" className="btn-primary flex-1 tablet:flex-none" onClick={save} disabled={!has || saving}>{saving ? s("saving") : s("save")}</button>
        {has && <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => { setTitle(""); setBody(""); setMsg(null); }}>{t("shared.discard")}</button>}
        <Link to="/teacher/ai" className="btn-secondary flex-1 tablet:flex-none">{s("cancel")}</Link>
      </div>
    </div>
  );
}
