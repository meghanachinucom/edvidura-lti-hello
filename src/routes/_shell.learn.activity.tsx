import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { learnerActivity, type ActivityKind, type ActivityRow } from "@/data/activity";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";

// LR-13 My activity. Plain words only — no raw records or IDs.
export const Route = createFileRoute("/_shell/learn/activity")({
  head: () => ({
    meta: [
      { title: t("pages.learnActivity") + t("app.titleSuffix") },
      { name: "description", content: t("LR-13.lead") },
      { property: "og:title", content: t("pages.learnActivity") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-13.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-13.${k}`, v);

function detail(r: ActivityRow): string {
  const d = r.detail;
  if (!d) return "—";
  if ("quiz" in d) return s("quizDetail", { type: s(d.quiz), n: d.score });
  if ("page" in d) return s("page", { n: d.page });
  return s("chapter", { n: d.chapter });
}

const columns: Column<ActivityRow>[] = [
  { key: "when", header: s("colWhen"), cell: (r) => formatIST(r.at) },
  { key: "action", header: s("colAction"), cell: (r) => s(`actions.${r.action}`) },
  { key: "item", header: s("colItem"), cell: (r) => r.item },
  { key: "detail", header: s("colDetail"), cell: (r) => detail(r) },
];

function Page() {
  const m = mockState.activity;
  const [filter, setFilter] = useState<"all" | ActivityKind>("all");
  const [loading, setLoading] = useState(true);
  useEffect(() => { const id = setTimeout(() => setLoading(false), m.loadingMs); return () => clearTimeout(id); }, [m.loadingMs]);
  const all = m.rows === "empty" ? [] : learnerActivity;
  const rows = all.filter((r) => filter === "all" || r.kind === filter);

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading titleKey="pages.learnActivity" />
      <p className="max-w-reading text-ink">{s("lead")}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="act-show" className="font-semibold text-ink">{s("show")}</label>
        <select id="act-show" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="min-h-11 w-full rounded-surface border border-border-control bg-surface px-3 text-ink tablet:w-64">
          {(["all", "lessons", "quizzes", "ebooks"] as const).map((k) => <option key={k} value={k}>{s(k)}</option>)}
        </select>
      </div>
      {loading ? <LoadingSkeleton variant="table" count={4} /> : (
        <DataTable caption={s("caption")} columns={columns} rows={rows} rowKey={(r) => r.id}
          empty={<EmptyState headingLevel={2} title={s("empty")} help={s("emptyHelp")} />} />
      )}
    </div>
  );
}
