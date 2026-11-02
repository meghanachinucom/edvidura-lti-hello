import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { instructorAccess } from "@/data/schoolAdmin";
import { personById } from "@/data/people";
import { mockState } from "@/data/mockState";

// SA-02 Instructors. No passwords, role changes, deactivation, bulk import or SSO.
export const Route = createFileRoute("/_shell/school-admin/teachers")({
  head: () => ({
    meta: [
      { title: t("SA-02.title") + t("app.titleSuffix") },
      { name: "description", content: t("SA-02.lead") },
      { property: "og:title", content: t("SA-02.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SA-02.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`SA-02.${k}`);
type Row = (typeof instructorAccess)[number];
const cols: Column<Row>[] = [
  { key: "name", header: s("colName"), cell: (r) => personById(r.personId)?.name ?? "" },
  { key: "code", header: s("colCode"), cell: (r) => r.code },
  { key: "classes", header: s("colClasses"), cell: (r) => r.classes.join(", ") },
  { key: "access", header: s("colAccess"), cell: (r) => s(r.access) },
];

function Page() {
  const m = mockState.schoolAdmin;
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (m.instructors === "loading") return;
    const x = setTimeout(() => setLoading(false), m.loadingMs);
    return () => clearTimeout(x);
  }, [m.instructors, m.loadingMs]);
  const rows = m.instructors === "empty" ? [] : instructorAccess;
  const steps = [1, 2, 3];

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 pb-24 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      <section aria-label={s("steps")}>
        <ol className="flex flex-col gap-3 tablet:flex-row">
          {steps.map((n) => (
            <li key={n} className="flex-1 rounded-surface border border-border bg-surface p-4">
              <p className="font-heading text-[18px] text-ink">{s(`s${n}t`)}</p>
              <p className="mt-1 text-ink">{s(`s${n}`)}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="bind">
        <h2 id="bind" className="font-heading text-[22px] text-ink">{s("bind")}</h2>
        <p className="mt-1 text-ink">{s("bindText")}</p>
      </section>
      {loading ? <LoadingSkeleton variant="table" count={3} /> : (
        <DataTable caption={s("caption")} columns={cols} rows={rows} rowKey={(r) => r.personId}
          empty={<EmptyState headingLevel={2} title={s("empty")} help="" />} />
      )}
    </div>
  );
}
