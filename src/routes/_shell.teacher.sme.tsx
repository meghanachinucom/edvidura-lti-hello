import { useId, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { smeSources, smeDefaults, type SourceDoc } from "@/data/smeSources";
import { ebooks } from "@/data/ebooks";
import { ebookChapters } from "@/data/ebookContent";
import { lessons } from "@/data/lessons";
import { mockState } from "@/data/mockState";

// TC-15 Source documents. No web search, external import or sharing across institutes.
export const Route = createFileRoute("/_shell/teacher/sme")({
  head: () => ({
    meta: [
      { title: t("TC-15.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-15.lead") },
      { property: "og:title", content: t("TC-15.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-15.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-15.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
const manualOptions = ebooks.flatMap((b) => [
  { value: b.id, label: b.title },
  ...(ebookChapters[b.id] ?? []).map((c) => ({ value: `${b.id}:${c.id}`, label: s("chapter", { book: b.title, chapter: c.title }) })),
]);

function Page() {
  const id = useId();
  const [active, setActive] = useState<SourceDoc[]>(mockState.teacher.sme === "empty" ? [] : smeSources);
  const [archived, setArchived] = useState<SourceDoc[]>([]);
  const [saving, setSaving] = useState<null | "manual" | "lesson" | "boot">(null);
  const [added, setAdded] = useState(false);
  const [title, setTitle] = useState("");
  const [display, setDisplay] = useState("");
  const [manual, setManual] = useState(manualOptions[0]!.value);
  const [titleErr, setTitleErr] = useState(false);
  const [lessonId, setLessonId] = useState(lessons[0]!.id);
  const [n, setN] = useState(10);

  const run = (kind: "manual" | "lesson" | "boot", done: () => void) => {
    setSaving(kind); setAdded(false);
    setTimeout(() => { setSaving(null); done(); setAdded(kind !== "boot"); }, 800);
  };
  const addManual = () => {
    if (!title.trim()) { setTitleErr(true); document.getElementById(`${id}-t`)?.focus(); return; }
    run("manual", () => { setActive((a) => [...a, { id: `src-${n}`, title: display.trim() || title.trim(), type: "manual" }]); setN(n + 1); setTitle(""); setDisplay(""); });
  };
  const addLesson = () => {
    const l = lessons.find((x) => x.id === lessonId)!;
    run("lesson", () => { setActive((a) => [...a, { id: `src-${n}`, title: l.title, type: "lesson" }]); setN(n + 1); });
  };

  const cols = (archive: boolean): Column<SourceDoc>[] => [
    { key: "title", header: s("colTitle"), cell: (d) => d.title },
    { key: "type", header: s("colType"), cell: (d) => s(d.type) },
    ...(archive ? [{ key: "action", header: s("colAction"), cell: (d: SourceDoc) => (
      <button type="button" className="btn-secondary" aria-label={`${s("archive")}: ${d.title}`}
        onClick={() => { setActive((a) => a.filter((x) => x.id !== d.id)); setArchived((a) => [...a, d]); setAdded(false); }}>{s("archive")}</button>
    ) }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div>
        <PageHeading text={s("title")} />
        <p className="mt-2 max-w-reading text-ink">{s("lead")}</p>
        <p className="mt-1 max-w-reading text-ink-muted">{s("note")}</p>
      </div>

      <div className="grid gap-4 desktop:grid-cols-2">
        <form noValidate className="space-y-3 rounded-surface border border-border bg-surface p-4" onSubmit={(e) => { e.preventDefault(); addManual(); }}>
          <h2 className="font-heading text-[18px] text-ink">{s("addManual")}</h2>
          <div>
            <label htmlFor={`${id}-t`} className="block font-semibold text-ink">{s("fTitle")}</label>
            <input id={`${id}-t`} value={title} onChange={(e) => { setTitle(e.target.value); setTitleErr(false); }}
              aria-invalid={titleErr || undefined} aria-describedby={titleErr ? `${id}-te` : undefined} className={`${input} ${titleErr ? "border-error" : ""}`} />
            {titleErr && <p id={`${id}-te`} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{s("titleError")}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-d`} className="block font-semibold text-ink">{s("displayName")} <span className="font-normal text-ink-muted">{s("optional")}</span></label>
            <input id={`${id}-d`} value={display} onChange={(e) => setDisplay(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-m`} className="block font-semibold text-ink">{s("manualSelect")}</label>
            <select id={`${id}-m`} value={manual} onChange={(e) => setManual(e.target.value)} className={input}>
              {manualOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={saving !== null}>{saving === "manual" ? s("saving") : s("addManualBtn")}</button>
        </form>
        <form noValidate className="space-y-3 rounded-surface border border-border bg-surface p-4" onSubmit={(e) => { e.preventDefault(); addLesson(); }}>
          <h2 className="font-heading text-[18px] text-ink">{s("addLesson")}</h2>
          <div>
            <label htmlFor={`${id}-l`} className="block font-semibold text-ink">{s("lessonSelect")}</label>
            <select id={`${id}-l`} value={lessonId} onChange={(e) => setLessonId(e.target.value)} className={input}>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={saving !== null}>{saving === "lesson" ? s("saving") : s("addLessonBtn")}</button>
        </form>
      </div>
      <p role="status" className="sr-only">{saving ? s("saving") : ""}</p>
      {added && <StatusBanner variant="success">{s("added")}</StatusBanner>}

      <section aria-labelledby={`${id}-a`} className="space-y-3">
        <h2 id={`${id}-a`} className="font-heading text-[22px] text-ink">{s("active")}</h2>
        {active.length === 0 ? (
          <EmptyState headingLevel={3} title={s("empty")} help={s("bootstrapHelp")} action={
            <button type="button" className="btn-secondary" disabled={saving !== null}
              onClick={() => run("boot", () => setActive(smeDefaults.filter((d) => !archived.some((a) => a.id === d.id))))}>
              {saving === "boot" ? s("saving") : s("bootstrap")}
            </button>
          } />
        ) : <DataTable caption={s("active")} columns={cols(true)} rows={active} rowKey={(r) => r.id} />}
      </section>

      {archived.length > 0 && (
        <section aria-labelledby={`${id}-x`} className="space-y-3">
          <h2 id={`${id}-x`} className="font-heading text-[22px] text-ink">{s("archived")}</h2>
          <DataTable caption={s("archived")} columns={cols(false)} rows={archived} rowKey={(r) => r.id} />
        </section>
      )}
    </div>
  );
}
