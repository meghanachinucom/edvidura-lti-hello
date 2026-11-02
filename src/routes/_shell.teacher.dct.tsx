import { useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { MarkdownPreview } from "@/components/teacher/MarkdownPreview";
import { DraftBadge } from "@/components/teacher/DraftBadge";
import { skills as registry, type Skill } from "@/data/skills";
import { microDrafts } from "@/data/aiDrafts";
import { mockState } from "@/data/mockState";

// TC-16 Micro-learning planner. No learner targeting, scores, auto-assignment or video player.
export const Route = createFileRoute("/_shell/teacher/dct")({
  head: () => ({
    meta: [
      { title: t("TC-16.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-16.lead") },
      { property: "og:title", content: t("TC-16.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-16.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-16.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

function Page() {
  const id = useId();
  const st = mockState.teacher.dct;
  const [all, setAll] = useState<Skill[]>(
    st === "empty" ? [] : st === "allLinked" ? registry.map((k) => ({ ...k, link: "linked" as const })) : registry,
  );
  const [plan, setPlan] = useState<string[]>(all.slice(0, 3).map((k) => k.code));
  const [pick, setPick] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [video, setVideo] = useState("");
  const [cap, setCap] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const missing = all.filter((k) => k.link === "missing").length;
  const rows = plan.map((c) => all.find((k) => k.code === c)).filter((k): k is Skill => !!k);
  const notInPlan = all.filter((k) => !plan.includes(k.code));
  const draftSkill = all.find((k) => k.code === draftFor);
  const draft = draftFor ? microDrafts[draftFor] : undefined;

  const generate = (code: string) => {
    setGenerating(code); setDraftFor(null); setSaved(null); setVideo(""); setCap("");
    setTimeout(() => { setGenerating(null); setDraftFor(code); }, 1200);
  };
  const save = () => {
    if (!draftSkill) return;
    setAll(all.map((k) => (k.code === draftSkill.code ? { ...k, link: "linked" } : k)));
    setSaved(draftSkill.title); setDraftFor(null);
  };

  const cols: Column<Skill>[] = [
    { key: "skill", header: s("colSkill"), cell: (k) => k.title },
    { key: "status", header: s("colStatus"), cell: (k) => s(k.link) },
    { key: "action", header: s("colAction"), cell: (k) => k.link === "missing"
      ? <button type="button" className="btn-secondary" aria-label={`${s("generate")}: ${k.title}`} disabled={generating !== null} onClick={() => generate(k.code)}>{s("generate")}</button>
      : "—" },
  ];

  if (all.length === 0) {
    return (
      <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
        <PageHeading text={s("title")} />
        <EmptyState title={s("empty")} help="" action={<Link to="/teacher/skills" className="btn-secondary">{s("toSkills")}</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />
      <p className="font-heading text-[22px] text-ink">
        {missing === 0 ? s("allLinked") : missing === 1 ? s("missing1") : s("missingN", { n: missing })}
      </p>

      {notInPlan.length > 0 && (
        <div className="flex flex-col gap-2 tablet:flex-row tablet:items-end">
          <div className="tablet:w-80">
            <label htmlFor={`${id}-p`} className="sr-only">{s("choose")}</label>
            <select id={`${id}-p`} value={pick} onChange={(e) => setPick(e.target.value)} className={input}>
              <option value="">{s("choose")}</option>
              {notInPlan.map((k) => <option key={k.code} value={k.code}>{k.title}</option>)}
            </select>
          </div>
          <button type="button" className="btn-secondary" disabled={!pick} onClick={() => { setPlan([...plan, pick]); setPick(""); }}>{s("addToPlan")}</button>
        </div>
      )}

      <DataTable caption={s("caption")} columns={cols} rows={rows} rowKey={(r) => r.code} />
      <p role="status" className="text-ink">{generating ? s("generating") : ""}</p>
      {saved && <StatusBanner variant="success">{s("saved", { skill: saved })}</StatusBanner>}

      {draft && draftSkill && (
        <section aria-labelledby={`${id}-d`} className="space-y-4 rounded-surface border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${id}-d`} className="font-heading text-[22px] text-ink">{s("draftFor", { skill: draftSkill.title })}</h2>
            <DraftBadge />
          </div>
          <p className="font-semibold text-ink">{draft.title}</p>
          <MarkdownPreview source={draft.body} />
          <div className="grid gap-4 desktop:grid-cols-2">
            <div>
              <label htmlFor={`${id}-v`} className="block font-semibold text-ink">{s("video")}</label>
              <p id={`${id}-vh`} className="text-sm text-ink-muted">{s("videoHelp")}</p>
              <input id={`${id}-v`} type="url" inputMode="url" value={video} aria-describedby={`${id}-vh`} onChange={(e) => setVideo(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor={`${id}-c`} className="block font-semibold text-ink">{s("caption1")}</label>
              <input id={`${id}-c`} value={cap} onChange={(e) => setCap(e.target.value)} className={input} />
            </div>
          </div>
          <AITrustNote audience="instructor" sources={draft.sources} />
          <div className="flex flex-col-reverse gap-2 tablet:flex-row">
            <button type="button" className="btn-secondary" onClick={() => setDraftFor(null)}>{t("shared.discard")}</button>
            <button type="button" className="btn-primary" onClick={save}>{s("save")}</button>
          </div>
        </section>
      )}
    </div>
  );
}
