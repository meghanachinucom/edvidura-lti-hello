import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { classActivity, type ActivityKind, type ActivityRow } from "@/data/activity";
import { personById } from "@/data/people";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";

// TC-04 Activity. For support, not surveillance — no time-spent, IDs or export.
export const Route = createFileRoute("/_shell/teacher/activity")({
  head: () => ({
    meta: [
      { title: t("TC-04.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-04.lead") },
      { property: "og:title", content: t("TC-04.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-04.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-04.${k}`);
const l = (k: string, v?: Record<string, string | number>) => t(`LR-13.${k}`, v);
const field = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

function detail(r: ActivityRow): string {
  const d = r.detail;
  if (!d) return "—";
  if ("quiz" in d) return l("quizDetail", { type: l(d.quiz), n: d.score });
  if ("page" in d) return l("page", { n: d.page });
  return l("chapter", { n: d.chapter });
}

const columns: Column<ActivityRow>[] = [
  { key: "when", header: l("colWhen") + " (IST)", cell: (r) => formatIST(r.at) },
  { key: "learner", header: s("colLearner"), cell: (r) => personById(r.personId)?.name ?? "" },
  { key: "action", header: l("colAction"), cell: (r) => l(`actions.${r.action}`) },
  { key: "item", header: l("colItem"), cell: (r) => r.item },
  { key: "detail", header: l("colDetail"), cell: (r) => detail(r) },
];

function Page() {
  const state = mockState.teacher.activity;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"all" | ActivityKind>("all");
  const all = state === "empty" ? [] : [...classActivity].sort((a, b) => b.at.localeCompare(a.at));
  const q = name.trim().toLowerCase();
  const rows = all.filter((r) => (kind === "all" || r.kind === kind) && (!q || (personById(r.personId)?.name ?? "").toLowerCase().includes(q)));

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div>
        <PageHeading text={s("title")} />
        <p className="mt-2 max-w-reading text-ink">{s("lead")}</p>
        <p className="mt-1 max-w-reading text-ink-muted">{s("note")}</p>
      </div>
      <div className="grid gap-4 tablet:grid-cols-2 desktop:max-w-2xl">
        <div>
          <label htmlFor="ta-name" className="block font-semibold text-ink">{s("name")}</label>
          <input id="ta-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="ta-kind" className="block font-semibold text-ink">{s("action")}</label>
          <select id="ta-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={field}>
            {(["all", "lessons", "quizzes", "ebooks"] as const).map((k) => <option key={k} value={k}>{l(k)}</option>)}
          </select>
        </div>
      </div>
      {state === "loading" ? <LoadingSkeleton variant="table" count={5} /> : (
        <DataTable caption={s("caption")} columns={columns} rows={rows} rowKey={(r) => r.id}
          empty={<EmptyState headingLevel={2} title={all.length === 0 ? s("empty") : s("noMatch")} help="" />} />
      )}
    </div>
  );
}
