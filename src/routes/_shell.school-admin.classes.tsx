import { StatusGem } from "@/components/shared/StatusGem";
import { useId, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { CohortEvents } from "@/components/admin/CohortEvents";
import { classBindings, type ClassBinding } from "@/data/schoolAdmin";
import { LessonCode } from "@/components/shared/LessonList";
import { mockState } from "@/data/mockState";

// SA-03 Classes & links. No webhooks, live panels, credentials or grade-passback claims.
export const Route = createFileRoute("/_shell/school-admin/classes")({
  head: () => ({
    meta: [
      { title: t("SA-03.title") + t("app.titleSuffix") },
      { name: "description", content: t("SA-03.lead") },
      { property: "og:title", content: t("SA-03.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SA-03.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`SA-03.${k}`);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
type Field = "code" | "name" | "subject" | "term";
const required: Field[] = ["code", "name"];

function Page() {
  const id = useId();
  const [rows, setRows] = useState<ClassBinding[]>(mockState.schoolAdmin.classes === "empty" ? [] : classBindings);
  const [v, setV] = useState<Record<Field, string>>({ code: "", name: "", subject: "", term: "" });
  const [errs, setErrs] = useState<Partial<Record<Field, boolean>>>({});
  const [saved, setSaved] = useState(false);
  const [boundMsg, setBoundMsg] = useState(false);

  const bind = (code: string) => {
    setRows(rows.map((r) => (r.code === code ? { ...r, bound: true } : r)));
    setBoundMsg(true);
  };

  const cols: Column<ClassBinding>[] = [
    { key: "class", header: s("colClass"), cell: (r) => r.name },
    { key: "code", header: s("colCode"), cell: (r) => r.code },
    { key: "course", header: s("colCourse"), cell: (r) => r.moodleCourse ? <>{r.moodleCourse} <LessonCode code={r.code} /></> : "—" },
    { key: "status", header: s("colStatus"), cell: (r) => r.bound ? <StatusGem tone="synced">{s("bound")}</StatusGem>
      : <button type="button" className="btn-secondary" aria-label={`${s("bind")}: ${r.code}`} onClick={() => bind(r.code)}>{s("bind")}</button> },
    { key: "how", header: s("colHow"), cell: () => <span className="text-ink-muted">{s("howText")}</span> },
    { key: "roster", header: s("colRoster"), cell: (r) => <button type="button" className="btn-secondary" aria-label={`${s("refresh")}: ${r.code}`}>{s("refresh")}</button> },
  ];

  const submit = () => {
    const e: Partial<Record<Field, boolean>> = {};
    required.forEach((f) => { if (!v[f].trim()) e[f] = true; });
    setErrs(e); setSaved(false);
    const first = required.find((f) => e[f]);
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return; }
    setRows([...rows, { code: v.code.trim(), name: v.name.trim(), moodleCourse: null, bound: false }]);
    setV({ code: "", name: "", subject: "", term: "" }); setSaved(true);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 pb-24 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      {rows.length > 0 && <CohortEvents />}
      {boundMsg && <StatusBanner variant="success">{s("boundMsg")}</StatusBanner>}
      <section aria-labelledby={`${id}-a`} className="space-y-3">
        <h2 id={`${id}-a`} className="font-heading text-[22px] text-ink">{s("active")}</h2>
        <DataTable caption={s("active")} columns={cols} rows={rows} rowKey={(r) => r.code}
          empty={<EmptyState headingLevel={3} title={s("empty")} help="" />} />
      </section>

      <form noValidate aria-labelledby={`${id}-f`} className="space-y-4 rounded-surface border border-border bg-surface p-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h2 id={`${id}-f`} className="font-heading text-[22px] text-ink">{s("add")}</h2>
        <div className="grid gap-4 tablet:grid-cols-2">
          {(["code", "name", "subject", "term"] as Field[]).map((f) => (
            <div key={f}>
              <label htmlFor={`${id}-${f}`} className="block font-semibold text-ink">{s(f)}</label>
              <input id={`${id}-${f}`} value={v[f]} onChange={(e) => { setV({ ...v, [f]: e.target.value }); setErrs({ ...errs, [f]: false }); }}
                aria-invalid={errs[f] || undefined} aria-describedby={errs[f] ? `${id}-${f}-e` : undefined}
                className={`${input} ${errs[f] ? "border-error" : ""}`} />
              {errs[f] && <p id={`${id}-${f}-e`} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{s(`${f}Error`)}</p>}
            </div>
          ))}
        </div>
        <button type="submit" className="btn-primary">{s("save")}</button>
      </form>
      {saved && <StatusBanner variant="success">{s("saved")}</StatusBanner>}
    </div>
  );
}
