import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { institute, type Institute } from "@/data/institute";
import { mockState } from "@/data/mockState";

// TC-17 Institutions. Exactly one row; no switcher, add form or onboarding link.
export const Route = createFileRoute("/_shell/institutions")({
  head: () => ({
    meta: [
      { title: t("TC-17.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-17.lead") },
      { property: "og:title", content: t("TC-17.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-17.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-17.${k}`);
const cols: Column<Institute>[] = [
  { key: "name", header: s("colName"), cell: (i) => i.name },
  { key: "code", header: s("colCode"), cell: (i) => i.code },
  { key: "moodle", header: s("colMoodle"), cell: (i) => i.moodleSite.replace(/^https?:\/\//, "").replace(/\/.*$/, "") },
  { key: "status", header: s("colStatus"), cell: () => s("connected") },
];

function Page() {
  const rows = mockState.teacher.institutions === "empty" ? [] : [institute];
  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />
      <DataTable caption={s("caption")} columns={cols} rows={rows} rowKey={(r) => r.code}
        empty={<EmptyState headingLevel={2} title={s("empty")} help="" />} />
    </div>
  );
}
