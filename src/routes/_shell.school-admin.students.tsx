import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { learners, type Person } from "@/data/people";
import { classes } from "@/data/course";
import { learnerCodes, demoRoster } from "@/data/schoolAdmin";
import { mockState } from "@/data/mockState";

// SA-04 Learners. No contact details, risk flags, bulk delete or add form.
export const Route = createFileRoute("/_shell/school-admin/students")({
  head: () => ({
    meta: [
      { title: t("SA-04.title") + t("app.titleSuffix") },
      { name: "description", content: t("SA-04.lead") },
      { property: "og:title", content: t("SA-04.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SA-04.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`SA-04.${k}`);
const cols: Column<Person>[] = [
  { key: "name", header: s("colName"), cell: (p) => p.name },
  { key: "code", header: s("colCode"), cell: (p) => learnerCodes[p.id] ?? "—" },
  { key: "class", header: s("colClass"), cell: (p) => p.classCode ?? "—" },
];

function Page() {
  const [q, setQ] = useState("");
  const [byClass, setByClass] = useState(false);
  const base = mockState.schoolAdmin.students === "empty" ? [] : learners;
  const n = q.trim().toLowerCase();
  const rows = base.filter((p) => !n || p.name.toLowerCase().includes(n));
  const empty = <EmptyState headingLevel={2} title={base.length === 0 ? s("empty") : s("noMatch")} help="" />;

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      <ol aria-label={s("steps")} className="flex flex-col gap-3 tablet:flex-row">
        {[1, 2, 3].map((i) => (
          <li key={i} className="flex-1 rounded-surface border border-border bg-surface p-4">
            <p className="font-heading text-[18px] text-ink">{s(`s${i}`)}</p>
            <p className="mt-1 text-ink">{s(`s${i}d`)}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end">
        <div className="tablet:w-80">
          <label htmlFor="sa-search" className="block font-semibold text-ink">{s("search")}</label>
          <input id="sa-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control" />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-ink">
          <input type="checkbox" checked={byClass} onChange={(e) => setByClass(e.target.checked)} className="size-5 accent-accent" />{s("byClass")}
        </label>
        {demoRoster && base.length > 0 && <span className="inline-flex h-fit items-center rounded-surface border border-border-control px-2 py-0.5 text-sm text-ink">{s("demo")}</span>}
      </div>
      {!byClass || rows.length === 0 ? (
        <DataTable caption={s("caption")} columns={cols} rows={rows} rowKey={(r) => r.id} empty={empty} />
      ) : (
        classes.map((c) => {
          const rs = rows.filter((p) => p.classCode === c.code);
          if (rs.length === 0) return null;
          return (
            <section key={c.code} aria-labelledby={`cls-${c.code}`} className="space-y-2">
              <h2 id={`cls-${c.code}`} className="font-heading text-[22px] text-ink">{c.title}</h2>
              <DataTable caption={c.title} columns={cols} rows={rs} rowKey={(r) => r.id} />
            </section>
          );
        })
      )}
    </div>
  );
}
