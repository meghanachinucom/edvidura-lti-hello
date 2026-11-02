import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { learners } from "@/data/people";
import { classAttempts, myAttempts } from "@/data/attempts";
import { mockState } from "@/data/mockState";

// TC-18 Learner directory. Own classes only; no contact details, risk, bulk actions or score sorting.
export const Route = createFileRoute("/_shell/student-directory")({
  head: () => ({
    meta: [
      { title: t("TC-18.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-18.lead") },
      { property: "og:title", content: t("TC-18.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-18.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-18.${k}`);
interface Row { id: string; name: string; attempts: number; average: number | null }

// Meena's full history lives in myAttempts; the others have one class attempt each.
const allRows: Row[] = learners.map((p) => {
  const as = p.id === "p-meena" ? myAttempts : classAttempts.filter((a) => a.personId === p.id);
  const avg = as.length ? Math.round((as.reduce((x, a) => x + a.score, 0) / (as.length * 5)) * 100) : null;
  return { id: p.id, name: p.name, attempts: as.length, average: avg };
});

const cols: Column<Row>[] = [
  { key: "learner", header: s("colLearner"), cell: (r) => r.name },
  { key: "attempts", header: s("colAttempts"), cell: (r) => String(r.attempts) },
  { key: "average", header: s("colAverage"), cell: (r) => (r.average === null ? "—" : `${r.average}%`) },
];

function Page() {
  const [q, setQ] = useState("");
  const base = mockState.teacher.directory === "empty" ? [] : allRows;
  const needle = q.trim().toLowerCase();
  const rows = base.filter((r) => !needle || r.name.toLowerCase().includes(needle));
  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />
      <div className="tablet:w-96">
        <label htmlFor="sd-search" className="block font-semibold text-ink">{s("search")}</label>
        <p id="sd-help" className="text-sm text-ink-muted">{s("lead")}</p>
        <input id="sd-search" type="search" value={q} aria-describedby="sd-help" onChange={(e) => setQ(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control" />
      </div>
      <DataTable caption={s("caption")} columns={cols} rows={rows} rowKey={(r) => r.id}
        empty={<EmptyState headingLevel={2} title={base.length === 0 ? s("empty") : s("noMatch")} help="" />} />
    </div>
  );
}
