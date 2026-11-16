import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { api } from "@/lib/api";
import { adaptSchoolOverview, type BackendSchoolOverview } from "@/lib/adapters";

export interface InstituteRow {
  name: string;
  code: string;
  moodleSite: string;
}

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
const cols: Column<InstituteRow>[] = [
  { key: "name", header: s("colName"), cell: (i) => i.name },
  { key: "code", header: s("colCode"), cell: (i) => i.code },
  {
    key: "moodle",
    header: s("colMoodle"),
    cell: (i) => i.moodleSite.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
  },
  { key: "status", header: s("colStatus"), cell: () => s("connected") },
];

function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InstituteRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<BackendSchoolOverview>("/api/v1/app/school-admin/overview");
        if (mounted) {
          const detail = adaptSchoolOverview(data);
          const moodleUrl =
            data.institution?.moodle_site || data.institution?.lms_url || "moodle.example.edu";
          setRows([
            {
              name: detail.name,
              code: detail.code,
              moodleSite: moodleUrl,
            },
          ]);
        }
      } catch {
        if (mounted) {
          setError(s("empty"));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />
      {error ? (
        <ErrorAlert message={error} />
      ) : loading ? (
        <LoadingSkeleton variant="table" count={2} />
      ) : (
        <DataTable
          caption={s("caption")}
          columns={cols}
          rows={rows}
          rowKey={(r) => r.code}
          empty={<EmptyState headingLevel={2} title={s("empty")} help="" />}
        />
      )}
    </div>
  );
}
