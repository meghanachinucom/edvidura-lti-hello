import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { classActivity, type ActivityRow } from "@/data/activity";
import { personById } from "@/data/people";
import { classes } from "@/data/course";
import { classOf } from "@/data/schoolAdmin";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";

// SA-06 Institute activity. No statement IDs, LRS/Tier columns, export or time-spent.
export const Route = createFileRoute("/_shell/school-admin/activity")({
  head: () => ({
    meta: [
      { title: t("SA-06.title") + t("app.titleSuffix") },
      { name: "description", content: t("SA-06.lead") },
      { property: "og:title", content: t("SA-06.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SA-06.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`SA-06.${k}`);
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
  const m = mockState.schoolAdmin;
  const [loading, setLoading] = useState(true);
  const [cls, setCls] = useState("all");
  const [name, setName] = useState("");
  useEffect(() => {
    if (m.activity === "loading") return;
    const x = setTimeout(() => setLoading(false), m.loadingMs);
    return () => clearTimeout(x);
  }, [m.activity, m.loadingMs]);
  const all = m.activity === "empty" ? [] : [...classActivity].sort((a, b) => b.at.localeCompare(a.at));
  const q = name.trim().toLowerCase();
  const rows = all.filter((r) => (cls === "all" || classOf(r.personId) === cls) && (!q || (personById(r.personId)?.name ?? "").toLowerCase().includes(q)));

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      <Link to="/school-admin/analytics" className="inline-flex min-h-11 items-center gap-1 text-ink underline">
        <ChevronLeft aria-hidden size={18} />{s("back")}
      </Link>
      <PageHeading text={s("title")} />
      <div className="grid gap-4 tablet:grid-cols-2 desktop:max-w-2xl">
        <div>
          <label htmlFor="sac-class" className="block font-semibold text-ink">{s("class")}</label>
          <select id="sac-class" value={cls} onChange={(e) => setCls(e.target.value)} className={field}>
            <option value="all">{s("allClasses")}</option>
            {classes.map((c) => <option key={c.code} value={c.code}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sac-name" className="block font-semibold text-ink">{s("name")}</label>
          <input id="sac-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
      </div>
      {loading ? <LoadingSkeleton variant="table" count={5} /> : (
        <DataTable caption={s("caption")} columns={columns} rows={rows} rowKey={(r) => r.id}
          empty={<EmptyState headingLevel={2} title={all.length === 0 ? s("empty") : s("noMatch")} help="" />} />
      )}
    </div>
  );
}
